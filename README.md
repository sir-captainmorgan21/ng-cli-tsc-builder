# Ng Cli Tsc Builder

A simple Angular cli builder using only tsc and file replacement.

## Use case

When you have a project you want to build with the Angular CLI without webpack.
We use only the tsc compiler.

## Accepted options:

    - tsConfig: Path to tsconfig file used for the compilation
    - outputPath: Folder to output build
    - rootDir: See --rootDir in https://www.typescriptlang.org/docs/handbook/compiler-options.html
    - sourceMap: Include sourceMap
    - fileReplacements: Replace file by another one (same as usual)

## Process

    - Clean previous dist folder
    - Build using TS compiler and options provided
    - Replace files if fileReplacements is provided
    - Clean all unused environment files

## Example of usage (within Nx monorepo)

```
"my-app": {
      "root": "apps/my-app",
      "sourceRoot": "apps/my-app/src",
      "projectType": "application",
      "prefix": "my-app",
      "schematics": {},
      "architect": {
        "build": {
          "builder": "@pmachaux/ng-cli-tsc-builder:build",
          "options": {
            "outputPath": "dist/apps/mlk/my-app",
            "tsConfig": "apps/my-app/tsconfig.app.json",
            "rootDir": "apps/my-app/src",
            "sourceMap": true
          },
          "configurations": {
            "production": {
              "fileReplacements": [
                {
                  "replace": "apps/my-app/src/environments/environment.ts",
                  "with": "apps/my-app/src/environments/environment.prod.ts",
                }
              ],
              "sourceMap": false
            }
          }
        },
        "lint": {
          "builder": "@angular-devkit/build-angular:tslint",
          "options": {
            "tsConfig": [
              "apps/my-app/tsconfig.app.json",
              "apps/my-app/tsconfig.spec.json"
            ],
            "exclude": ["**/node_modules/**", "!apps/my-app/**"]
          }
        }
      }
    }
```
