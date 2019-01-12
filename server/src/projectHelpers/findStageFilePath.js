const { configResolver } = require('../ioHelpers').dethunked;
const sanitizeFolderName = require('../utils/sanitizeFolderName');
const { PROJECTS_DIR, MODEL_DB } = require('../config');
const path = require('path');

const findStageFilePath = async (stage) => {
  const sc = await configResolver(MODEL_DB.STAGE_CONTAINERS, stage.containerId);
  const scg = await configResolver(MODEL_DB.STAGE_CONTAINER_GROUPS, sc.stageContainerGroupId);
  
  if(!scg.title) throw("Requires StageContainerGroup Title for project resolution.");
  if(!sc.version) throw("Requires StageContainer Version for project resolution.");
  if(!stage.title) throw("Requires Stage Title for project resolution.");

  return path.join(PROJECTS_DIR,
    sanitizeFolderName(scg.title),
    sanitizeFolderName(sc.version),
    sanitizeFolderName(stage.title));
}

module.exports = findStageFilePath;
