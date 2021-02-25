import { BuilderOutput, createBuilder } from "@angular-devkit/architect";
import * as childProcess from "child_process";
import * as fs from "fs";
import { JsonObject } from "@angular-devkit/core";
import { join } from "path";

interface Options extends JsonObject {
  command: string;
  args: string[];
}

const cleanUnusedEnvfiles = (distPath: string, context: any) => {
  return new Promise<number>((resolve, reject) => {
    if (distPath) {
      const envRegex = `${distPath}/environments/environment.*.js`;
      const child = childProcess.spawn(`npx rimraf ${envRegex}`, [], { shell: true });
      child.stderr.on("error", (data) => {
        context.logger.error(data.toString());
        reject(1);
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

const fileReplacementsBuilder = (
  fileReplacements: Array<{ replace: string; with: string }>,
  distPath: string,
  rootDir: string,
  context: any
): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    const filesWrites = fileReplacements.map((r) => {
      return new Promise((fResolve, fReject) => {
        const withPath = distPath + r.with.replace(rootDir, "").replace(".ts", ".js");
        fs.readFile(withPath, (errRead, data) => {
          if (errRead) {
            context.logger.error(JSON.stringify(errRead));
            fReject();
          }
          const replacePath = distPath + r.replace.replace(rootDir, "").replace(".ts", ".js");
          fs.writeFile(replacePath, data, (errWrite) => {
            if (errWrite) {
              context.logger.error(JSON.stringify(errWrite));
              fReject();
            }
            fs.unlink(withPath, (errClean) => {
              if (errClean) {
                context.logger.error(JSON.stringify(errClean));
                fReject();
              }
              fResolve();
            });
          });
        });
      });
    });
    Promise.all(filesWrites).then(
      () => {
        resolve(0);
      },
      () => {
        resolve(1);
      }
    );
  });
};

const cleanDistFolder = (outDirFolder: string, context: any): Promise<number> => {
  return new Promise<number>((resolve, reject) => {
    if (outDirFolder) {
      const child = childProcess.spawn(`npx rimraf ${outDirFolder}`, [], { shell: true });
      child.stderr.on("error", (data) => {
        context.logger.error(data.toString());
        reject(1);
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
  return new Promise<BuilderOutput>(async (resolve, reject) => {
    context.reportStatus(`Executing tsc build --${options.tsConfig}...`);

    if (!options.outputPath) {
      context.logger.error("You need to provide outputPath in angular.json");
    }
    const distFolder = join(process.cwd(), options.outputPath as string);
    const outDir = `--outDir ${distFolder}`;
    const rootDir = options.rootDir ? `--rootDir ${options.rootDir}` : "";
    const sourceMap = `--sourceMap ${!!options.sourceMap}`;
    const fileReplacements = options.fileReplacements;

    const cleanDistFolderCode = await cleanDistFolder(options.outputPath ? distFolder : "", context);
    if (cleanDistFolderCode) {
      reject(1);
    }

    const child = childProcess.spawn(`npx tsc --project ${options.tsConfig} ${outDir} ${rootDir} ${sourceMap}`, [], { shell: true });
    child.stdout.on("data", (data) => {
      context.logger.info(data.toString());
    });
    child.stderr.on("error", (data) => {
      context.logger.error(data.toString());
      reject(1);
    });
    context.reportStatus(`Done.`);
    child.on("close", async (code) => {
      if (!fileReplacements) {
        resolve({ success: code === 0 });
      } else {
        if (code !== 0) {
          resolve({ success: false });
        }
        const fReplacementCode = await fileReplacementsBuilder(fileReplacements as any, distFolder, (options.rootDir as string) || "", context);
        if (fReplacementCode) {
          resolve({ success: false });
        }
        const cleanEnvFilesCode = await cleanUnusedEnvfiles(distFolder, context);
        resolve({ success: cleanEnvFilesCode === 0 });
      }
    });
  });
});
