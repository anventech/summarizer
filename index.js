const readline = require("readline");
const fs = require("fs");
const path = require("path");
const moment = require("moment");
const yargs = require("yargs-parser");
const video_stitch = require("video-stitch");
const util = require("util");
const hb = require("handbrake-js");
const concat = require("ffmpeg-concat");
const copyFilePromise = fs.promises.copyFile;
const unlinkFilePromise = fs.promises.unlink;

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function log(...args) {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  console.log(...args);
  terminal.prompt(true);
}

function clear() {
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  terminal.prompt(true);
}

let replays_path = "D:\\Bibliotecas\\Videos\\Replays";
let recipient_name = moment().format("DD-MM-YYYY");

log("Bienvenid@ a Summarizer, una aplicación de terminal para organizar replays y crear resumenes a partir de ellos.");

terminal.on("line", async (l) => {
  if (l.startsWith("/")) {
    const parsed = yargs(l.slice(1));
    const args = parsed._;
    const command = args.shift(); 

    if (command == "folder") {
      if (!args[0]) return log("Debes insertar la ruta de la carpeta de repeticiones principal como argumento.");

      replays_path = args.join(" ");

      return log("Carpeta de repeticiones principal establecida.");
    }

    if (command == "recipient") {
      if (!args[0]) return log("Debes insertar el nombre que te gustaría que tuviera la carpeta que organizará los clips como argumento.");

      recipient_name = args.join(" ");

      return log("Carpeta de clips establecida.");
    }

    /*if (command == "summary") {
      if (!replays_path) return log("Debes configurar la ruta de la carpeta de repeticiones principal usando \"/folder [ruta completa]\"");

      const videos = fs.readdirSync(replays_path).filter(x => x.endsWith(".flv"));

      const mapped = videos.map((m) => {
        return {
          fileName: path.join(replays_path, m)
        };
      });

      const recipient_path = path.join(replays_path, recipient_name);

      if (!fs.existsSync(recipient_path)) fs.mkdirSync(recipient_path);
      
      const summary_path = path.join(recipient_path, `Resumen - ${recipient_name}.mp4`);

      video_stitch.concat({
        ffmpeg_path: "ffmpeg.exe",
        silent: true,
        overwrite : true
      }).clips(mapped).output(`"${summary_path}"`).concat().then(() => {
        const promises = [];

        videos.forEach(vid => {
          return promises.push(copyFilePromise(path.join(replays_path, vid), path.join(recipient_path, vid)));
        });

        Promise.all(promises).then(() => {
          const ul_promises = [];

          videos.forEach(vid => {
            return ul_promises.push(unlinkFilePromise(path.join(replays_path, vid)));
          });

          Promise.all(ul_promises).then(() => {
            return log("El resumen está listo, el archivo queda en:", summary_path);
          });
        }).catch((e) => console.error(e));
      }).catch((e) => console.error(e));
    }*/
  
    if (command == "summary") {
      if (!replays_path) return log("Debes configurar la ruta de la carpeta de repeticiones principal usando \"/folder [ruta completa]\"");

      let videos = fs.readdirSync(replays_path).filter(x => x.endsWith(".flv"));

      const temp_folder = path.join(replays_path, "Temp");

      if (!fs.existsSync(temp_folder)) fs.mkdirSync(temp_folder);

      const convertVideo = (input, output) => {
        return new Promise((resolve, reject) => {
          hb.spawn({
            input: input,
            output: output,
            encoder: "x264",
            preset: "Very Fast 720p30"
          }).on("error", reject).on("complete", resolve);
        });
      };

      const convert_promises = [];

      videos.forEach((video) => {
        const filename = path.basename(video, ".flv");

        convert_promises.push(convertVideo(path.join(replays_path, video), path.join(temp_folder, `${filename}.mp4`)));
      });

      Promise.all(convert_promises).then(async () => {
        const outputVideos = fs.readdirSync(temp_folder).filter(x => x.endsWith(".mp4"));

        const recipient_path = path.join(replays_path, recipient_name);

        if (!fs.existsSync(recipient_path)) fs.mkdirSync(recipient_path);

        const summary_path = path.join(recipient_path, `Resumen - ${recipient_name}.mp4`);

        await concat({
          output: summary_path,
          videos: outputVideos.map(x => path.join(temp_folder, x)),
          transition: {
            name: "fade",
            duration: 800
          }
        });

        const copy_promises = [];

        outputVideos.forEach(vid => {
          return copy_promises.push(copyFilePromise(path.join(temp_folder, vid), path.join(recipient_path, vid)));
        });

        Promise.all(copy_promises).then(() => {
          const unlink_promises = [];

          videos.forEach(vid => {
            return unlink_promises.push(unlinkFilePromise(path.join(replays_path, vid)));
          });

          outputVideos.forEach(vid => {
            return unlink_promises.push(unlinkFilePromise(path.join(temp_folder, vid)));
          });

          Promise.all(unlink_promises).then(() => {
            return log("El resumen está listo, el archivo queda en:", summary_path);
          });
        });
      });
    }
  }

  return clear();
});