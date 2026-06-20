import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8081'

async function proxy(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = `${BACKEND}/api/${params.path.join('/')}${request.nextUrl.search}`

  const contentType = request.headers.get('content-type') ?? ''
  const isMultipart = contentType.includes('multipart/form-data')

  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? isMultipart ? await request.blob() : await request.text()
      : undefined

  const headers: Record<string, string> = {}
  if (!isMultipart) headers['Content-Type'] = 'application/json'
  else headers['Content-Type'] = contentType  // preserve multipart boundary
  const incoming = request.headers.get('cookie')
  if (incoming) headers['Cookie'] = incoming

  const backendRes = await fetch(backendUrl, {
    method: request.method,
    headers,
    body,
  })

  const responseBody = await backendRes.text()
  const response = new NextResponse(responseBody, {
    status: backendRes.status,
    headers: { 'Content-Type': 'application/json' },
  })

  // Forward Set-Cookie from Spring Boot, re-scoped to localhost:3000
  for (const cookie of backendRes.headers.getSetCookie()) {
    response.headers.append('Set-Cookie', cookie)
  }

  return response
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
}
