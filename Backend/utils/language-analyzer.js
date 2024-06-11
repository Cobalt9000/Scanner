import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const stat = promisify(fs.stat);

const languageExtensions = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.py': 'Python',
  '.java': 'Java',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.less': 'Less',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  // Add more extensions and languages as needed
};

async function analyzeLocalDirectory(directoryPath) {
  const languageStats = {};
  let totalBytes = 0;

  const scanDir = async (dir) => {
    const items = await promisify(fs.readdir)(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const itemStat = await stat(itemPath);

      if (itemStat.isDirectory()) {
        await scanDir(itemPath);
      } else if (itemStat.isFile()) {
        const ext = path.extname(itemPath).toLowerCase();
        if (ext in languageExtensions) {
          const language = languageExtensions[ext];
          languageStats[language] = (languageStats[language] || 0) + itemStat.size;
          totalBytes += itemStat.size;
        }
      }
    }
  };

  await scanDir(directoryPath);

  return Object.fromEntries(
    Object.entries(languageStats).map(([lang, bytes]) => [lang, (bytes / totalBytes) * 100])
  );
}

async function analyzeGitHubRepository(owner, repo, octokit) {
  try {
    const { data: languageData } = await octokit.rest.repos.listLanguages({ owner, repo });

    const totalBytes = Object.values(languageData).reduce((sum, bytes) => sum + bytes, 0);
    const languageStats = Object.fromEntries(
      Object.entries(languageData).map(([lang, bytes]) => [lang, (bytes / totalBytes) * 100])
    );

    return languageStats;
  } catch (error) {
    console.error('Error fetching repository languages:', error);
    throw error;
  }
}

export { analyzeLocalDirectory, analyzeGitHubRepository };