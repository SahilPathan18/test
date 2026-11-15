/**
 * Netlify Serverless Function Demo: /api or /.netlify/functions/api
 *
 * This function executes on Netlify's serverless edge infrastructure (AWS Lambda).
 * It demonstrates:
 * 1. Handling HTTP requests & query params
 * 2. Accessing environment variables securely (without leaking to client)
 * 3. Returning proper JSON response with CORS headers
 */

exports.handler = async function (event, context) {
  // CORS Headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  // Sample serverless payload
  const responseData = {
    success: true,
    message: 'Hello from Netlify Serverless Functions!',
    timestamp: new Date().toISOString(),
    environment: {
      node_version: process.version,
      netlify_region: process.env.AWS_REGION || 'edge-cdn',
      database_env_configured: !!(process.env.SUPABASE_URL || process.env.DATABASE_URL)
    },
    client_ip: event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown',
    http_method: event.httpMethod,
    path: event.path,
    query_params: event.queryStringParameters || {}
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(responseData, null, 2)
  };
};
