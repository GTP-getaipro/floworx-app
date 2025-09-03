#!/usr/bin/env node

/**
 * Debug script to check what HTML content is being served
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

async function debugHtmlContent() {
  console.log('🔍 HTML CONTENT DEBUG');
  console.log('=====================');
  console.log(`Fetching: ${PRODUCTION_URL}`);
  console.log('');

  try {
    const response = await fetch(PRODUCTION_URL);
    const html = await response.text();
    
    console.log('📄 HTML CONTENT (first 2000 characters):');
    console.log('==========================================');
    console.log(html.substring(0, 2000));
    console.log('...');
    console.log('');
    
    console.log('🔍 CONTENT ANALYSIS:');
    console.log('====================');
    console.log(`- Contains "FloWorx": ${html.includes('FloWorx')}`);
    console.log(`- Contains "react": ${html.includes('react')}`);
    console.log(`- Contains "root": ${html.includes('root')}`);
    console.log(`- Contains script tags: ${html.includes('<script')}`);
    console.log(`- Contains CSS: ${html.includes('<link')}`);
    console.log(`- Contains error: ${html.includes('error') || html.includes('Error')}`);
    console.log(`- Contains "Something went wrong": ${html.includes('Something went wrong')}`);
    console.log(`- Response status: ${response.status}`);
    console.log(`- Content-Type: ${response.headers.get('content-type')}`);
    
  } catch (error) {
    console.error('❌ Failed to fetch HTML:', error.message);
  }
}

debugHtmlContent();
