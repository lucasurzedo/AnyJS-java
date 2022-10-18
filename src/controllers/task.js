const mongoose = require('mongoose');
const fs = require('fs');
const java = require('java');

const ModelTask = require('../models/task');
const utils = require('../utils/index');
const db = require('../db');

java.asyncOptions = {
  asyncSuffix: undefined,
  syncSuffix: '',
  promiseSuffix: 'Promise',
  promisify: require('util').promisify,
};

async function executeJavaMethod(parameters) {
  const {
    args,
    code,
    mainClassPath,
    method,
    methodArgs,
  } = parameters;

  try {
    const path = `./src/codesJava/${code}`;

    const files = fs.readdirSync(path);
    files.forEach((element) => {
      java.classpath.push(`${path}/${element}`);
    });

    const Class = java.import(mainClassPath);

    if (args.length > 0) {
      if (args.length === 1) {
        const objArgs = args[0][code];
        const obj = new Class(...objArgs);

        if (methodArgs.length > 0) {
          return await obj[method](...methodArgs);
        }
        return await obj[method];
      }
      const objArgs = [];
      let argAux = [];
      for (let i = 0; i < args.length; i += 1) {
        for (const key in args[i]) {
          if (key === code) {
            objArgs.push(args[i][key]);
          } else {
            argAux = args[i][key];
            const ObjAux = java.import(`${key}`);
            objArgs.push(new ObjAux(...argAux));
          }
        }
      }
      const obj = new Class(...objArgs);

      if (methodArgs.length > 0) {
        return await obj[method](...methodArgs);
      }
      return await obj[method]();
    }

    const obj = new Class();

    if (methodArgs.length > 0) {
      return await obj[method](...methodArgs);
    }
    return await obj[method]();
  } catch (error) {
    return error;
  }
}

async function executeLocalBatch(req, res) {
  const {
    taskNamePrefix,
    code,
    args,
    mainClassPath,
    method,
    methodArgs,
  } = req.body;

  const {
    language,
  } = req.params;

  const collectionName = (`${code}_task`).toLowerCase();

  const Task = mongoose.model(collectionName, ModelTask, collectionName);

  const documentCode = await db.getDocument('registers', 'codeName', code);

  if (!documentCode) {
    const jsonError = {
      uri: `${req.baseUrl}${req.url}`,
      result: `there is no code ${code}`,
    };
    res.status(404).send(jsonError);
    return;
  }

  const codes = documentCode.code;
  const methodsLinks = [];

  // Separate names and links in a object
  for (let i = 0; i < codes.length; i += 1) {
    for (const key in codes[i]) {
      methodsLinks.push({ name: key, link: codes[i][key] });
    }
  }

  const DIRECTORY = `./src/codesJava/${code}/`;

  const FILETYPE = '.jar';

  // Verify if the file already exists
  for (let i = 0; i < methodsLinks.length; i += 1) {
    const path = `${DIRECTORY}${methodsLinks[i].name}${FILETYPE}`;

    if (fs.existsSync(path)) {
      methodsLinks.splice(i, 1);
      i -= 1;
    }
  }

  if (methodsLinks.length > 0) {
    console.log('Downloading codes');
    const downloadedCode = await utils.downloadCode(methodsLinks, language, code);
    if (!downloadedCode) {
      const jsonResult = {
        uri: `${req.baseUrl}${req.url}/${code}/${taskName}`.toLowerCase(),
        result: 'error downloading the codes',
      };
      res.status(400).send(jsonResult);
    }
  }

  for (let i = 0; i < methodArgs.length; i += 1) {
    const document = await db.getDocument(collectionName, 'executionName', `${taskNamePrefix}${i}`);

    if (document) {
      const jsonResult = {
        uri: `${req.baseUrl}${req.url}${`${taskNamePrefix}${i}`}`,
        result: `execution ${`${taskNamePrefix}${i}`} already exists`,
      };
      res.status(409).send(jsonResult);
      return;
    }

    const newTask = new Task({
      executionName: `${taskNamePrefix}${i}`,
      parameterValue: args,
      method,
      methodArgs: methodArgs[i],
      taskResult: null,
    });

    // eslint-disable-next-line no-await-in-loop
    await newTask.save();

    executeJavaMethod({
      args, code, mainClassPath, method, methodArgs: methodArgs[i], language,
    }).then((result) => {
      console.log(result);
      newTask.taskResult = result;
      newTask.save();
    });
  }

  const jsonResult = {
    result: 'success',
  };

  res.status(200).send(jsonResult);
}

module.exports = {
  executeLocalBatch,
};
