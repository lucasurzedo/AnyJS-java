const Downloader = require('nodejs-file-downloader');

const DIRECTORY = './src/codesJava';

const FILETYPE = '.jar';

async function downloadCode(methodsLinks, language, codeName) {
  console.log(methodsLinks);

  const directory = `${DIRECTORY}/${codeName}`;

  for (let i = 0; i < methodsLinks.length; i += 1) {
    const fileName = `${methodsLinks[i].name}${FILETYPE}`;
    const url = methodsLinks[i].link;

    const downloader = new Downloader({
      url,
      directory,
      fileName,
    });
    try {
      // eslint-disable-next-line no-await-in-loop
      await downloader.download();
      console.log('Download Finished');
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  return true;
}

module.exports = {
  downloadCode,
};
