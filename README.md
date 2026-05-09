# NGINX Music Player
A little frontend which crawls an NGINX with autoindex turned on to find music files to generate a music player app

## Setup
- Use [beets](https://beets.readthedocs.io/en/stable/guides/main.html) to import and organise your music into the standard directory structure. This app parses the metadata from the file paths.
- Configure NGINX to host your media directory with auto-indexing turned on with JSON formatting and this apps distribution (see `nginx.conf.example`)
- Configure `.env` to point to where you will host your music directory
- Use `npm install && npm run build` copy the dist directory to be hosted by nginx