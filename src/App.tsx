import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useRef, useState, type Ref } from "react";

const NGINX_STATIC_MEDIA_SERVER_URL = import.meta.env
  .VITE_NGINX_STATIC_MEDIA_SERVER_URL;

const fetchAll = async (): Promise<Track[]> => {
  return fetchDirectory(NGINX_STATIC_MEDIA_SERVER_URL);
};

const extractMetadata = async (path: string): Promise<Track> => {
  const regex =
    /\/(?<artist>[^/]+)\/(?<album>[^/]+)\/(?<tracknumber>[0-9][0-9])(?<name>[^/]+)\.(mp3|m4a)$/;
  const result = regex.exec(path);
  const artist = result?.groups?.artist;
  const album = result?.groups?.album;
  const name = result?.groups?.name;

  return {
    path,
    artist: artist ? decodeURI(artist) : "Unknown Artist",
    album: album ? decodeURI(album) : "Unknown Album",
    name: name ? decodeURI(name) : "Unknown Name",
  };
};

const fetchDirectory = async (path: string): Promise<Track[]> => {
  console.log("about to make fetch happen");
  const res = await fetch(path);
  const response: NginxListing = await res.json();
  return (
    await Promise.all(
      response.map(async ({ name, type }) => {
        if (type === "directory") {
          return fetchDirectory(`${path}/${encodeURI(name)}`);
        } else if (name.match(/\.(m4a)|(mp3)/)) {
          return extractMetadata(`${path}/${encodeURI(name)}`);
        }
      }),
    )
  )
    .flat()
    .filter((track) => track !== undefined);
};

const queryClient = new QueryClient();

type Track = {
  path: string;
  artist: string;
  album: string;
  name: string;
};

type NginxListing = {
  name: string;
  type: "directory";
}[];

const Listing = ({
  listings,
  playTrack,
}: {
  listings: Listings;
  playTrack: (track: Track) => void;
}) => {
  return (
    <div>
      {Object.entries(listings).map(([artist, albums]) => (
        <>
          <h2>{artist}</h2>
          <>
            {Object.entries(albums).map(([album, tracks]) => (
              <>
                <h3>{album}</h3>
                <div className="tracks">
                  {tracks.map((track) => (
                    <button onClick={() => playTrack(track)}>
                      {track.name}
                    </button>
                  ))}
                </div>
              </>
            ))}
          </>
        </>
      ))}
    </div>
  );
};

const Player = ({
  selectedTrack,
  audioRef,
}: {
  selectedTrack?: Track;
  audioRef: Ref<HTMLAudioElement>;
}) => {
  return (
    <div className={`player ${selectedTrack ? "track-selected" : "no-track"}`}>
      <div className="metadata">
        <p>{selectedTrack?.name}</p>
        <p>{selectedTrack?.artist}</p>
      </div>
      <audio id="audio-player" controls ref={audioRef} onEnded={() => {}}>
        <source id="audioSource" src={selectedTrack?.path}></source>
      </audio>
    </div>
  );
};

type Listings = Record<string, Record<string, Track[]>>;

const useListings = (): { listings: Listings | undefined } => {
  const { data: tracks } = useQuery({
    queryKey: ["items"],
    queryFn: fetchAll,
  });

  if (!tracks) {
    return { listings: undefined };
  }

  const listings: Record<string, Record<string, Track[]>> = Object.entries(
    Object.groupBy(tracks, (track) => track.artist),
  ).reduce(
    (acc, [artist, tracks]) => ({
      ...acc,
      [artist]: Object.groupBy(tracks ?? [], (track) => track.album),
    }),
    {},
  );
  return { listings };
};

const PlayerAndListing = () => {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [selectedTrack, setSelectedTrack] = useState<Track | undefined>(
    undefined,
  );

  const { listings } = useListings();

  const playTrack = (track: Track) => {
    setSelectedTrack(track);
    audioRef.current?.load();
    audioRef.current?.play();
  };

  return (
    <main>
      <Player selectedTrack={selectedTrack} audioRef={audioRef} />
      {listings && <Listing listings={listings} playTrack={playTrack} />}
    </main>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlayerAndListing />
    </QueryClientProvider>
  );
}

export default App;
