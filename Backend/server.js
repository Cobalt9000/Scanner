import express from 'express';
import { scanGitHubRepository } from './scanners/github-scanner.js';
import scanDirectory from './scanners/file-scanner.js';
import scanFiles from './scanners/pii-localScanner.js';
import { analyzeLocalDirectory, analyzeGitHubRepository } from './utils/language-analyzer.js';
import { Octokit } from 'octokit';
import cors from 'cors';
import dotenv from "dotenv";
dotenv.config();

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.post('/scan-github', async (req, res) => {
  const { owner, repo, regexPairs, fileExtensions } = req.body;

  try {
    const [piiVulnerabilities, remaining] = await scanGitHubRepository(owner, repo, regexPairs, fileExtensions);
    res.json({ piiVulnerabilities, remaining });
  } catch (error) {
    console.error('Error scanning GitHub repository:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'Failed to scan GitHub repository' });
  }
});

app.post('/scan-directory', (req, res) => {
  const { directoryPath, extensionArray, regexPairs } = req.body;

  if (!directoryPath || typeof directoryPath !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing directoryPath in request body' });
  }

  if (!Array.isArray(extensionArray)) {
    return res.status(400).json({ error: 'extensionArray must be an array' });
  }

  if (!regexPairs || typeof regexPairs !== 'object') {
    return res.status(400).json({ error: 'Invalid or missing regexPairs in request body' });
  }

  try {
    const filePaths = scanDirectory(directoryPath, extensionArray);
    const piiVulnerabilities = scanFiles(filePaths, regexPairs);

    res.json(piiVulnerabilities);
  } catch (error) {
    console.error('Error scanning directory:', error);
    res.status(500).json({ error: 'Failed to scan directory', details: error.message });
  }
});

app.post('/analyze-github-repo', async (req, res) => {
  const { owner, repo } = req.body;

  if (!owner || typeof owner !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing owner in request body' });
  }

  if (!repo || typeof repo !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing repo in request body' });
  }

  try {
    const languageStats = await analyzeGitHubRepository(owner, repo, octokit);
    res.json(languageStats);
  } catch (error) {
    console.error('Error analyzing GitHub repository:', error);
    res.status(500).json({ error: 'Failed to analyze GitHub repository', details: error.message });
  }
});

app.post('/analyze-local-directory', async (req, res) => {
  const { directoryPath } = req.body;

  if (!directoryPath || typeof directoryPath !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing directoryPath in request body' });
  }

  try {
    const languageStats = await analyzeLocalDirectory(directoryPath);
    res.json(languageStats);
  } catch (error) {
    console.error('Error analyzing local directory:', error);
    res.status(500).json({ error: 'Failed to analyze local directory', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});