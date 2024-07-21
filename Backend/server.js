import express from 'express';
import { scanGitHubRepository } from './scanners/github-scanner.js';
import scanDirectory from './scanners/file-scanner.js';
import scanFiles from './scanners/pii-localScanner.js';
import { analyzeLocalDirectory, analyzeGitHubRepository } from './utils/language-analyzer.js';
import { Octokit } from 'octokit';
import cors from 'cors';
import dotenv from "dotenv";
import remainingRequest from './utils/request-remaining.js';
import mailData from './utils/mail.js';
import Project from './models/project.model.js';
import ScanReport from './models/scanReport.model.js';
import connectToMongoDB from './db.js';
import autoPopulate from './utils/autoPopulate.js';
import { TextServiceClient } from '@google-ai/generativelanguage';
import { GoogleAuth } from 'google-auth-library';
import mongoose from 'mongoose';
dotenv.config();
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

app.post('/scan-github', async (req, res) => {
  const { owner, repo, regexPairs } = req.body;
  
  try {
    const piiVulnerabilities = await scanGitHubRepository(owner, repo, regexPairs);
    res.json(piiVulnerabilities);
  } catch (error) {
    console.error('Error scanning GitHub repository:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'Failed to scan GitHub repository' });
  }
});

app.post('/scan-directory', (req, res) => {
  const { directoryPath, regexPairs } = req.body;

  if (!directoryPath || typeof directoryPath !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing directoryPath in request body' });
  }

  if (!regexPairs || typeof regexPairs !== 'object') {
    return res.status(400).json({ error: 'Invalid or missing regexPairs in request body' });
  }

  try {
    const filePaths = scanDirectory(directoryPath);
    const piiVulnerabilities = scanFiles(filePaths, regexPairs);

    res.json(piiVulnerabilities);
  } catch (error) {
    console.error('Error scanning directory:', error);
    res.status(500).json({ error: 'Failed to scan directory', details: error.message });
  }
});

app.post('/github-repo-stats', async (req, res) => {
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

app.post('/local-directory-stats', async (req, res) => {
  const { directoryPath } = req.body;

  if (!directoryPath || typeof directoryPath !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing directoryPath in request body' });
  }

  try {
    const languageStats = await analyzeLocalDirectory(directoryPath);//extensions to be scanned are written manually right now. Try to get some fix for that
    res.json(languageStats);
  } catch (error) {
    console.error('Error analyzing local directory:', error);
    res.status(500).json({ error: 'Failed to analyze local directory', details: error.message });
  }
});

app.post("/email", async (req, res) => {
  console.log("Received email request:", req.body);
  const {jsonData, receiverEmail} = req.body
  try {
    const result = await mailData(jsonData, receiverEmail)
    return res.status(200).json({ message: "Email sent successfully", result })
  } catch(err) {
    console.error("Error sending email:", err)
    return res.status(500).json({ error: "Unable to send email" })
  }
})

app.get('/remaining_requests', async (req, res) => {
  try{
    const rem = await remainingRequest()
    res.send(`Number of Remaining Request: ${rem}`)
  } catch(err){
    return res.send("Unable to Fetch Remaining Request")
  }
})

app.get('/getAllProjects', async (req, res) => {
  try {
    const projects = await Project.find()
      .sort({ lastScanAt: -1 })
      .limit(10)  // Limit to the 10 most recently scanned projects
      .populate({
        path: 'scans',
        options: { sort: { timestamp: -1 }}
      });
    
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/getReport/:reportId', async (req, res) => {
  try {
    const report = await ScanReport.findById(req.params.reportId)
      .populate('project', 'projectName');
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/createReport', async (req, res) => {
  const { projectName, username, reportData } = req.body;

  try {
    let project = await Project.findOne({ projectName });
    
    if (!project) {
      project = new Project({ projectName });
    }

    const scanReport = new ScanReport({
      username,
      project: project._id,
      reportData
    });

    await scanReport.save();

    project.scans.push(scanReport._id);
    project.lastScanAt = scanReport.timestamp;
    await project.save();

    res.status(201).json(scanReport);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/deleteProject/:projectId', async (req, res) => {
  const { projectId } = req.params

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const project = await Project.findById(projectId).session(session)
    if(!project) {
      await session.abortTransaction()
      session.endSession()
      res.status(404).send({
        msg: "Project Not found for the Id given"
      })
      return
    }

    await ScanReport.deleteMany({ project: projectId }).session(session)
    await Project.findByIdAndDelete(projectId).session(session)

    await session.commitTransaction();
    session.endSession();

    res.status(200).send({
      msg: "This project and its associated scans have been deleted"
    })

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    
    res.status(500).send({
      msg: "Something went wrong",
      error : err.message
    })
  }
})

app.delete('/deleteScan/:scanId', async (req, res) => {
  const { scanId } = req.params

  try {
    const scan = await ScanReport.findById(scanId);
    if(!scan) {
      res.status(404).send({
        msg: "Scan does not exist"
      })
      return
    }

    const project = await Project.findById(scan.project)
    if(!project) {
      res.status(404).send({
        msg: "Project Not found"
      })
      return
    }

    project.scans = project.scans.filter(id => !id.equals(scanId))
    await project.save()

    await ScanReport.findByIdAndDelete(scanId)
    res.status(200).send({
      msg: "Scan deleted Successfully"
    })

  } catch(error) {
    res.status(500).send({
      msg: "Error Occured",
      error: error.message
    })
  }
})

app.post("/regexValue", async (req, res) => {
  const {data} = req.body;
  const response = await autoPopulate(data)
  return res.json(response)
})

app.post('/gemini-chat', async (req, res) => {
  const { message } = req.body;
  const prompt = `Suggest me the possible PIIs to be scanned in a ${message} project with only PII names nothing else, give each pii name in a square bracket and make them comma seperated values`;
  
  const client = new TextServiceClient({
    authClient: new GoogleAuth().fromAPIKey(process.env.GEMINI_API_KEY),
  });

  try {
    const result = await client.generateText({
      model: 'models/text-bison-001',
      prompt: { text: prompt },
    });

    const response = result[0].candidates[0].output.replace(/\*/g, '').trim();

    res.json({ response });
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    res.status(500).json({ error: 'Failed to get response from Gemini' });
  }
});

app.listen(port, () => {
  connectToMongoDB();
  console.log(`Server is running on http://localhost:${port}`);
});