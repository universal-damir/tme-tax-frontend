// processDocuments.cjs
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

// Initialize Google AI and Pinecone (unchanged)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

// Enhanced configuration
const CONFIG = {
  chunking: {
    maxChunkSize: 1000,
    overlap: 200,
  },
  embedding: {
    model: "embedding-001",
    batchSize: 100,
  },
  paths: {
    documentsDir: "./documents",
    processedDir: "./processed",
    hashesFile: "./processed/document_hashes.json"
  }
};

const index = pinecone.index(process.env.PINECONE_INDEX);

// New function to calculate document hash
async function calculateFileHash(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// New function to load and save document hashes
async function loadProcessedHashes() {
  try {
    const content = await fs.readFile(CONFIG.paths.hashesFile, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return {};
  }
}

async function saveProcessedHash(filePath, hash) {
  const hashes = await loadProcessedHashes();
  hashes[path.basename(filePath)] = hash;
  await fs.mkdir(path.dirname(CONFIG.paths.hashesFile), { recursive: true });
  await fs.writeFile(CONFIG.paths.hashesFile, JSON.stringify(hashes, null, 2));
}

// Modified processDocument function
async function processDocument(filePath) {
  console.log(`Processing document: ${filePath}`);
  
  // Calculate file hash
  const fileHash = await calculateFileHash(filePath);
  const processedHashes = await loadProcessedHashes();
  const fileName = path.basename(filePath);
  
  // Check if file was already processed
  if (processedHashes[fileName] === fileHash) {
    console.log(`File ${fileName} was already processed (duplicate detected)`);
    
    // Move to processed directory without processing
    const processedPath = path.join(CONFIG.paths.processedDir, fileName);
    await fs.mkdir(CONFIG.paths.processedDir, { recursive: true });
    await fs.rename(filePath, processedPath);
    
    return;
  }
  
  // Parse PDF and continue with existing processing
  const document = await parsePDF(filePath);
  if (!document) return;
  
  const chunks = splitIntoChunks(
    document.text,
    CONFIG.chunking.maxChunkSize,
    CONFIG.chunking.overlap
  );
  
  const embeddings = await createEmbeddings(chunks);
  await storeInPinecone(chunks, embeddings, document.metadata);
  
  // Move to processed directory and save hash
  const processedPath = path.join(CONFIG.paths.processedDir, fileName);
  await fs.mkdir(CONFIG.paths.processedDir, { recursive: true });
  await fs.rename(filePath, processedPath);
  await saveProcessedHash(fileName, fileHash);
  
  console.log(`Completed processing: ${filePath}`);
}

// Rest of your existing functions remain unchanged
// (parsePDF, splitIntoChunks, createEmbeddings, storeInPinecone)

// Modified main processing function
async function processAllDocuments() {
  try {
    await fs.mkdir(CONFIG.paths.documentsDir, { recursive: true });
    
    const files = await fs.readdir(CONFIG.paths.documentsDir);
    const pdfFiles = files
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => path.join(CONFIG.paths.documentsDir, file));
    
    if (pdfFiles.length === 0) {
      console.log(`No PDF files found in ${CONFIG.paths.documentsDir}`);
      return;
    }
    
    console.log('Found PDF files:', pdfFiles);
    console.log('Checking for duplicates...');
    
    // Process each document
    for (const file of pdfFiles) {
      await processDocument(file);
    }
    
    console.log('Document processing completed successfully!');
  } catch (error) {
    console.error('Error processing documents:', error);
    process.exit(1);
  }
}

// Start processing
processAllDocuments();