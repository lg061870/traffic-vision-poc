// Copies the Flow clips and app screens the video uses from docs/assets
// into public/. They stay out of Git here to avoid a second copy.
import { copyFileSync, mkdirSync } from "node:fs";

const files = [
  "clips/clip1_hora_pico.mp4",
  "clips/clip2_morazan.mp4",
  "clips/clip3_abordando.mp4",
  "clips/clip4_a_bordo.mp4",
  "clips/clip5_llegada.mp4",
  "screen0_innobus_splash.jpg",
  "screen1_innobus_home_transit.jpg",
  "screen2_innobus_routes_transit.jpg",
  "screen3_innobus_details_transit.jpg",
  "screen4_innobus_onboard_transit.jpg",
  "screen5_innobus_fleet_transit.jpg",
  "transit_home_passengers_no_adulto.jpg",
];

mkdirSync("public/clips", { recursive: true });
for (const file of files) {
  copyFileSync(`../../docs/assets/${file}`, `public/${file}`);
}
console.log(`Copied ${files.length} files to public/`);
