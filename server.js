// ==============================================================================
// 파일명: server.js
// 설명: Node.js 내장 http 모듈을 사용하여 추가 설치 없이 node server.js로 실행하는 웹 서버
// 주요 기능:
//   1. public/ 디렉터리의 정적 웹 파일(index.html, styles.css, app.js 등) 서비스
//   2. /api/analyze 경로의 POST 요청을 api/analyze.js 파일로 연결하여 처리
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const analyzeHandler = require('./api/analyze');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// 정적 파일 확장자별 Content-Type 매핑 표
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // 1. /api/analyze 요청 처리 (POST 방식)
  if (req.url === '/api/analyze' || req.url === '/api/analyze/') {
    if (req.method === 'POST') {
      let body = '';

      // 클라이언트로부터 보내온 JSON Body 데이터를 조각(chunk) 단위로 수신합니다.
      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          // JSON 파싱 후 req.body 속성에 바인딩합니다.
          req.body = body ? JSON.parse(body) : {};
        } catch (e) {
          req.body = {};
        }

        // Express와 동일한 res.status(), res.json(), res.setHeader() 헬퍼 추가
        res.status = function (code) {
          res.statusCode = code;
          return res;
        };

        res.json = function (obj) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(obj));
        };

        // 기존 api/analyze.js 핸들러 실행
        analyzeHandler(req, res);
      });
      return;
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: { message: 'POST 요청만 허용됩니다.' } }));
      return;
    }
  }

  // 2. public/ 정적 파일 서비스 처리
  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

  // 보안 처리: 상대 경로 상위 이동(Directory Traversal) 방지
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Access Denied');
    return;
  }

  const extname = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // 파일이 없을 경우 index.html fallback 또는 404 반환
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// 서버 바인딩 및 시작
server.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Node.js 감성 분석 서버가 시작되었습니다!`);
  console.log(`👉 브라우저 접속 주소: http://localhost:${PORT}`);
  console.log(`==================================================`);
});
