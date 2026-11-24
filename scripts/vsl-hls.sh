#!/bin/zsh
# Verkaufsvideos (VSL) als HLS-Stream für die Check-Seiten aufbereiten.
# Quelle: kolac-content/6-werbung/verkaufsvideos/verkaufsvideo-<slug>.mp4
# Ziel:   public/videos/vsl/<slug>/ (240p, 360p, 540p, 720p, 2-s-Stücke, poster.jpg)
# Aufruf: zsh scripts/vsl-hls.sh [slug …]   (ohne Angabe alle vier)
set -e
SRC=~/Documents/Code/internal/kolac-content/6-werbung/verkaufsvideos
SLUGS=(${@:-treppenlift gebaeudereinigung hoerakustik autohaus allgemein})
for s in $SLUGS; do
  O=public/videos/vsl/$s
  rm -rf $O; mkdir -p $O
  ffmpeg -v error -y -i $SRC/verkaufsvideo-$s.mp4 \
    -filter_complex "[0:v]split=4[a][b][c][d];[a]scale=-2:240[v0];[b]scale=-2:360[v1];[c]scale=-2:540[v2];[d]scale=-2:720[v3]" \
    -map "[v0]" -map 0:a -map "[v1]" -map 0:a -map "[v2]" -map 0:a -map "[v3]" -map 0:a \
    -c:v libx264 -preset slow -profile:v main -pix_fmt yuv420p -g 50 -keyint_min 50 -sc_threshold 0 \
    -b:v:0 220k -maxrate:v:0 260k -bufsize:v:0 440k \
    -b:v:1 450k -maxrate:v:1 520k -bufsize:v:1 900k \
    -b:v:2 900k -maxrate:v:2 1000k -bufsize:v:2 1800k \
    -b:v:3 1800k -maxrate:v:3 2000k -bufsize:v:3 3600k \
    -c:a aac -ac 2 -b:a:0 48k -b:a:1 96k -b:a:2 96k -b:a:3 128k \
    -f hls -hls_time 2 -hls_playlist_type vod -hls_flags independent_segments \
    -hls_segment_filename "$O/%v/seg%03d.ts" -master_pl_name master.m3u8 \
    -var_stream_map "v:0,a:0,name:240 v:1,a:1,name:360 v:2,a:2,name:540 v:3,a:3,name:720" "$O/%v/index.m3u8"
  ffmpeg -v error -y -ss 1.5 -i $SRC/verkaufsvideo-$s.mp4 -frames:v 1 -vf scale=1280:-2 -q:v 4 $O/poster.jpg
  echo "$s: $(du -sh $O | cut -f1)"
done
