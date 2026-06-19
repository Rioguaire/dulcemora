const R2_ORIGIN = 'https://pub-5984752a3add48f9bc4bcd3a4feac8d5.r2.dev'

const MIME = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
}

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const path = url.pathname.replace('/img', '/Catal')
  const ext = path.substring(path.lastIndexOf('.'))
  const contentType = MIME[ext] || 'image/webp'
  const r2Url = R2_ORIGIN + path
  const resp = await fetch(r2Url)
  const headers = new Headers(resp.headers)
  headers.set('Content-Type', contentType)
  headers.set('Access-Control-Allow-Origin', '*')
  return new Response(resp.body, { status: resp.status, headers })
}
