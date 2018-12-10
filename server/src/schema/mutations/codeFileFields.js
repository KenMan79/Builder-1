const { findCodeFilePaths } = require('../../projectHelpers');
const { CodeFileType } = require('../models');
const {
  configWriter,
  fileWriter,
  configResolver,
  fileRemove,
  configRemove,
} = require('../../utils/ioHelpers');
const { LOOKUP_KEY, MODEL_DB } = require('../../config');
const { ObjectID } = require('mongodb');
const fs = require('fs-extra');
const {
  GraphQLString,
  GraphQLBoolean,
  GraphQLList,
} = require('graphql');

const cfProjectPropNames = {
  initialCode: true
}

const codeFileMutationArgs = {
  id: { type: GraphQLString },
  name: { type: GraphQLString },
  executable: { type: GraphQLBoolean },
  executablePath: { type: GraphQLString },
  fileLocation: { type: GraphQLString },
  hasProgress: { type: GraphQLBoolean },
  mode: { type: GraphQLString },
  readOnly: { type: GraphQLBoolean },
  testFixture: { type: GraphQLBoolean },
  visible: { type: GraphQLBoolean },
  stageContainerId: { type: GraphQLString },
  codeStageIds: { type: new GraphQLList(GraphQLString) },
  initialCode: { type: GraphQLString },
}

module.exports = {
  deleteCodeFile: {
    type: CodeFileType,
    args: {
      id: { type: GraphQLString },
    },
    async resolve(_, props) {
      const codeFile = await configResolver(MODEL_DB.CODE_FILES, props.id);

      const { codeStageIds } = codeFile;
      for(let i = 0; i < codeStageIds.length; i++) {
        const codeStage = await configResolver(MODEL_DB.STAGES, codeStageIds[i]);
        const index = codeStage.codeFileIds.indexOf(props.id);
        if(index >= 0) {
          codeStage.codeFileIds.splice(index, 1);
        }
        await configWriter(MODEL_DB.STAGES, codeStage);
      }

      const paths = await findCodeFilePaths(codeFile);
      await Promise.all(paths.map(fileRemove));
      await configRemove(MODEL_DB.CODE_FILES, props.id);
    }
  },
  createCodeFile: {
    type: CodeFileType,
    args: codeFileMutationArgs,
    async resolve (_, props) {
      props.id = ObjectID().toString();
      props.initialCode = props.initialCode || "";
      props.executablePath = (props.executablePath || props.name);

      const numStages = props.codeStageIds ? props.codeStageIds.length : 0;
      for(let i = 0; i < numStages; i++) {
        const id = props.codeStageIds[i];
        const stage = await configResolver(MODEL_DB.STAGES, id);
        stage.codeFileIds.push(props.id);
        await configWriter(MODEL_DB.STAGES, stage);
      }

      const keys = Object.keys(props);
      for(let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if(cfProjectPropNames[key]) {
          const paths = await findCodeFilePaths(props);
          await Promise.all(paths.map(async (path) => {
            return await fileWriter(path, props[key]);
          }));
          props[key] = LOOKUP_KEY;
        }
      }
      return configWriter(MODEL_DB.CODE_FILES, props);
    }
  },
  modifyCodeFile: {
    type: CodeFileType,
    args: codeFileMutationArgs,
    async resolve (_, props) {
      const codeFile = await configResolver(MODEL_DB.CODE_FILES, props.id);
      const merged = { ...codeFile, ...props };

      const newPaths = await findCodeFilePaths(merged);
      const previousPaths = await findCodeFilePaths(codeFile);

      for(let i = 0; i < previousPaths.length; i++) {
        const newPath = newPaths[i];
        const previousPath = previousPaths[i];
        if(previousPath !== newPath) {
            await fs.rename(previousPath, newPath);
        }
      }

      const keys = Object.keys(props);
      for(let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if(cfProjectPropNames[key]) {
          await Promise.all(newPaths.map(async (path) => {
            return await fileWriter(path, merged[key]);
          }));
          merged[key] = LOOKUP_KEY;
        }
      }

      return configWriter(MODEL_DB.CODE_FILES, merged);
    }
  }
}