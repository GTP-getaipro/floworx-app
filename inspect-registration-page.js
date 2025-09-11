#!/usr/bin/env node

/**
 * INSPECT REGISTRATION PAGE
 * =========================
 * Detailed inspection of the registration page structure
 */

const { chromium } = require('playwright');

async function inspectRegistrationPage() {
  console.log('🔍 INSPECTING REGISTRATION PAGE');
  console.log('===============================');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for console messages from the page
  page.on('console', msg => {
    console.log(`🖥️  Browser console: ${msg.text()}`);
  });
  
  // Listen for network requests
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType()
    });
  });
  
  try {
    console.log('📱 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Get page title and URL
    const title = await page.title();
    const url = await page.url();
    console.log(`📄 Page title: ${title}`);
    console.log(`🔗 Current URL: ${url}`);
    
    // Get all form elements
    const pageStructure = await page.evaluate(() => {
      const structure = {
        forms: [],
        inputs: [],
        buttons: [],
        links: [],
        errors: [],
        headings: []
      };
      
      // Get all forms
      document.querySelectorAll('form').forEach((form, index) => {
        structure.forms.push({
          index,
          action: form.action,
          method: form.method,
          id: form.id,
          className: form.className
        });
      });
      
      // Get all inputs
      document.querySelectorAll('input').forEach((input, index) => {
        structure.inputs.push({
          index,
          type: input.type,
          name: input.name,
          id: input.id,
          placeholder: input.placeholder,
          required: input.required,
          className: input.className
        });
      });
      
      // Get all buttons
      document.querySelectorAll('button').forEach((button, index) => {
        structure.buttons.push({
          index,
          type: button.type,
          text: button.textContent.trim(),
          id: button.id,
          className: button.className,
          disabled: button.disabled
        });
      });
      
      // Get all links
      document.querySelectorAll('a').forEach((link, index) => {
        if (link.textContent.toLowerCase().includes('google') || 
            link.textContent.toLowerCase().includes('oauth') ||
            link.href.includes('oauth')) {
          structure.links.push({
            index,
            text: link.textContent.trim(),
            href: link.href,
            id: link.id,
            className: link.className
          });
        }
      });
      
      // Get error messages
      document.querySelectorAll('.error, .alert-danger, [class*="error"], .text-red-500, .text-danger').forEach((error, index) => {
        structure.errors.push({
          index,
          text: error.textContent.trim(),
          className: error.className
        });
      });
      
      // Get headings
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading, index) => {
        structure.headings.push({
          index,
          tag: heading.tagName.toLowerCase(),
          text: heading.textContent.trim()
        });
      });
      
      return structure;
    });
    
    console.log('\n📋 PAGE STRUCTURE ANALYSIS:');
    console.log('===========================');
    
    console.log(`\n📝 FORMS (${pageStructure.forms.length}):`);
    pageStructure.forms.forEach(form => {
      console.log(`   Form ${form.index}: ${form.method} ${form.action || 'No action'}`);
      console.log(`     ID: ${form.id || 'None'}, Class: ${form.className || 'None'}`);
    });
    
    console.log(`\n📥 INPUTS (${pageStructure.inputs.length}):`);
    pageStructure.inputs.forEach(input => {
      console.log(`   Input ${input.index}: ${input.type} - ${input.name || input.id || 'No name/id'}`);
      console.log(`     Placeholder: ${input.placeholder || 'None'}`);
      console.log(`     Required: ${input.required}, Class: ${input.className || 'None'}`);
    });
    
    console.log(`\n🔘 BUTTONS (${pageStructure.buttons.length}):`);
    pageStructure.buttons.forEach(button => {
      console.log(`   Button ${button.index}: "${button.text}" (${button.type})`);
      console.log(`     ID: ${button.id || 'None'}, Class: ${button.className || 'None'}`);
      console.log(`     Disabled: ${button.disabled}`);
    });
    
    console.log(`\n🔗 OAUTH/GOOGLE LINKS (${pageStructure.links.length}):`);
    pageStructure.links.forEach(link => {
      console.log(`   Link ${link.index}: "${link.text}"`);
      console.log(`     Href: ${link.href}`);
      console.log(`     Class: ${link.className || 'None'}`);
    });
    
    console.log(`\n📰 HEADINGS (${pageStructure.headings.length}):`);
    pageStructure.headings.forEach(heading => {
      console.log(`   ${heading.tag.toUpperCase()}: ${heading.text}`);
    });
    
    console.log(`\n❌ ERRORS (${pageStructure.errors.length}):`);
    pageStructure.errors.forEach(error => {
      console.log(`   Error ${error.index}: ${error.text}`);
    });
    
    // Take a screenshot
    await page.screenshot({ path: 'registration-page-detailed.png', fullPage: true });
    console.log('\n📸 Screenshot saved: registration-page-detailed.png');
    
    // Check network requests
    console.log(`\n🌐 NETWORK REQUESTS (${networkRequests.length}):`);
    const apiRequests = networkRequests.filter(req => req.url.includes('/api/'));
    console.log(`   API requests: ${apiRequests.length}`);
    apiRequests.forEach(req => {
      console.log(`     ${req.method} ${req.url}`);
    });
    
    // Wait for user to see the page
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
    return { success: true, pageStructure, networkRequests };
    
  } catch (error) {
    console.log(`❌ Error inspecting page: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🔍 INSPECT REGISTRATION PAGE');
  console.log('============================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const result = await inspectRegistrationPage();
  
  console.log('\n📊 INSPECTION RESULTS');
  console.log('====================');
  
  if (result.success) {
    console.log('✅ Page inspection completed successfully');
    console.log('📋 Detailed structure analysis available above');
    console.log('📸 Screenshot saved for visual reference');
  } else {
    console.log('❌ Page inspection failed');
    console.log(`Error: ${result.error}`);
  }
  
  console.log('\n🔍 REGISTRATION PAGE INSPECTION COMPLETE!');
  
  return result;
}

main().catch(console.error);
