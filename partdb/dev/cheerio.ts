import * as cheerio from 'cheerio'

const $ = cheerio.load(`
<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Refresh" content=";url=https://ultro.browning.edu">
</head>
<body>
</body>
</html>
`)

console.log($('meta[http-equiv="refresh"]').prop('content'))
