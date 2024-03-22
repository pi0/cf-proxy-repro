import { createServer } from 'node:http'
import { chdir } from 'node:process'
import { getPlatformProxy } from "wrangler"

chdir(new URL('.', import.meta.url).pathname)
process.env.PWD = process.cwd()

const proxy = await getPlatformProxy({})
const bucket = proxy.env.BLOB

const server = createServer(async (req, res) => {
  let message = ""

  // Handle upload on POST
  if (req.method === 'POST') {
    const webRequest = await readRequest(req)
    const form = await webRequest.formData()
    const image = form.get("image");
    await bucket.put(image.name, image);
    message = `Image uploaded successfully ${image.name}`
  }

  // Serve images on GET /r2/:key
  if (req.url.startsWith('/r2/')) {
    const object = await bucket.get(decodeURI(req.url.slice(4)))
    if (object.httpMetadata?.contentType) {
      res.setHeader('Content-Type', object.httpMetadata?.contentType)
    }
    res.setHeader('Content-Length', object.size)
    // await sendStream(res, object.body)
    res.end(await streamToBuff(res, object.body))
    return
  }


  // List images
  const { objects } = await bucket.list({
    limit: 500,
    include: ["httpMetadata", "customMetadata"],
  });

  const imgs = objects
    .map((obj) => {
      return /* html */ `<img src="/r2/${obj.key}" alt="${obj.key}" width="300" />`;
    })
    .join("\n");

  res.setHeader('Content-Type', 'text/html')
  res.end(/* html */ `<!DOCTYPE html>
<html>
<head>
</head>
<body>
<div>
  ${message}
  <form method="POST" enctype="multipart/form-data">
    <label for="image">Upload an image:</label>
    <input type="file" id="image" name="image" accept="image/png,image/jpeg" required>
    <button type="submit">Upload</button>
  </form>
</div>
<br>
${imgs}
  `)
})

server.listen(3030, () => {
  console.log('Server running at http://localhost:3030/')
})

async function readRequest(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks)
  return new Request(new URL(req.url, 'http://localhost:3030').toString(), {
    duplex: "half",
    method: req.method,
    headers: req.headers,
    body: body
  })
}

async function sendStream(res, stream) {
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
    }),
  )
  res.end();
}

async function streamToBuff(res, stream) {
  console.log('reading stream to buffer...')
  const chunks = [];
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        console.log('new chunk...')
        chunks.push(chunk);
      },
    }),
  )
  console.log('stream read to buffer.')
  return Buffer.concat(chunks);
}
