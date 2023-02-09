const { BigQuery } = require('@google-cloud/bigquery')

let client
if (process.env.VERCEL_GITHUB_COMMIT) {
  // Running on Vercel
  const jsonKey = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const key = JSON.parse(jsonKey)
  client = new BigQuery({
    projectId: 'domeneo-180412',
    credentials: key,
  })
} else {
  // Running locally
  const jsonKey = process.env.BIGQUERY_JSON_KEY_FILE_PATH
  client = new BigQuery({
    projectId: 'domeneo-180412',
    keyFilename: jsonKey,
  })
}

export async function queryData(query) {
  const [rows] = await client.query({
    query,
  })
  return rows
}
