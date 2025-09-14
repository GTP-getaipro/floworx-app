#!/usr/bin/env node

/**
 * Debug Production Dashboard Issue
 * Tests the exact dashboard flow that's failing
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

);
);
  console.log('Overall Success:', result.success ? '✅ YES' : '❌ NO');
  if (result.registrationStatus) {
    console.log('Registration:', result.registrationStatus === 201 ? '✅ SUCCESS' : `❌ FAILED (${result.registrationStatus})`);
  }
  if (result.loginStatus) {
    console.log('Login:', result.loginStatus === 200 ? '✅ SUCCESS' : `❌ FAILED (${result.loginStatus})`);
  }
  if (result.statusEndpointStatus) {
    console.log('User Status:', result.statusEndpointStatus === 200 ? '✅ SUCCESS' : `❌ FAILED (${result.statusEndpointStatus})`);
  }
  if (result.dashboardStatus) {
    console.log('Dashboard:', result.dashboardStatus === 200 ? '✅ SUCCESS' : `❌ FAILED (${result.dashboardStatus})`);
  }
  if (result.testUser) {
    console.log('Test User:', result.testUser);
  }
  if (result.tokenReceived !== undefined) {
    console.log('Token Received:', result.tokenReceived ? '✅ YES' : '❌ NO');
  }
  if (result.error) {
    console.log('Error:', result.error);
  }
}).catch(console.error);
