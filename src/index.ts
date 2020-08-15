import { BuilderOutput, createBuilder } from "@angular-devkit/architect";
import * as childProcess from "child_process";
import { JsonObject } from "@angular-devkit/core";
import { join } from "path";

interface Options extends JsonObject {
  command: string;
  args: string[];
}

const fileReplacementsBuilder = (fileReplacements: any): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    resolve(0);
  });
};

const cleanDistFolder = (outDirFolder: string, context: any): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    if (outDirFolder) {
      const child = childProcess.spawn(`npx rimraf ${outDirFolder}`, [], { shell: true });
      child.stderr.on("error", (data) => {
        context.logger.error(data.toString());
        reject();
      });
      context.reportStatus(`Done.`);
      child.on("close", (code) => {
        resolve(code);
      });
    } else {
      resolve(0);
    }
  });
};

export default createBuilder<Options>((options, context) => {
  return new Promise(async (resolve, reject) => {
    context.reportStatus(`Executing tsc build --${options.tsConfig}...`);
    const distFolder = join(process.cwd(), (options.outputPath as string) || "");
    const outDir = options.outputPath ? `--outDir ${distFolder}` : "";
    const rootDir = options.rootDir ? `--rootDir ${options.rootDir}` : "";
    const fileReplacements = options.fileReplacements;

    const cleanDistFolderCode = await cleanDistFolder(options.outputPath ? distFolder : "", context);
    if (cleanDistFolderCode) {
      reject();
    }

    const child = childProcess.spawn(`npx tsc --project ${options.tsConfig} ${outDir} ${rootDir}`, [], { shell: true });
    child.stdout.on("data", (data) => {
      context.logger.info(data.toString());
    });
    child.stderr.on("error", (data) => {
      context.logger.error(data.toString());
      reject();
    });
    context.reportStatus(`Done.`);
    child.on("close", (code) => {
      if (!!fileReplacements) {
        resolve({ success: code === 0 });
      } else {
        if (code !== 0) {
          resolve({ success: false });
        }
        fileReplacementsBuilder(fileReplacements).then((fCode) => {
          resolve({ success: fCode === 0 });
        });
      }
    });
  });
});
