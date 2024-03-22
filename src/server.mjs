import { createServer } from 'node:http'
import { getPlatformProxy } from "wrangler"

const proxy = await getPlatformProxy({})
const bucket = proxy.env.BLOB
// const bucket = patchBucket(proxy.env.BLOB)

process.on('SIGINT', async () => {
  console.log('Cleaning up...')
  await proxy.dispose()
  process.exit(0)
})

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
    await sendReadableStream(res, object.body)
    // res.end(await readableStreamToBuff(object.body))
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

async function sendReadableStream(res, stream) {
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
    }),
  )
  res.end();
}

async function readableStreamToBuff(stream) {
  console.log('reading stream to buffer...')
  const chunks = [];
  await stream.pipeTo(
    new WritableStream({
      write(chunk) {
        process.stdout.write(` +${chunk.length}`)
        chunks.push(chunk);
      },
      close() {
        console.log('stream close')
      }
    }),
  )
  console.log('stream read!')
  return Buffer.concat(chunks);
}

/**
 * Workaround for https://github.com/cloudflare/workers-sdk/issues/5360
*/
function patchBucket(bucket) {
  let _mutex

  const _get = bucket.get.bind(bucket)

  async function getAndRead(...args) {
    const obj = await _get(...args)
    const chunks = [];
    for await (const chunk of obj.body) {
      chunks.push(chunk);
    }
    const body = new ReadableStream({
      start(controller) {
        chunks.forEach(chunk => controller.enqueue(chunk))
        controller.close()
      },
      close() {
        chunks.length = 0
      }
    })
    return { ...obj, body }
  }

  async function get(...args) {
    if (_mutex) {
      await _mutex
    }
    try {
      _mutex = getAndRead(...args)
      const obj = await _mutex
      return obj
    } finally {
      _mutex = undefined
    }
  }

  return new Proxy(bucket, {
    get(target, prop) {
      if (prop === 'get') {
        return get
      }
      return Reflect.get(target, prop)
    }
  })
}
