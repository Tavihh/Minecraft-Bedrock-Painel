// importações
const multer = require('multer')
const path = require('path')
const fs = require('fs-extra')

// path
const TmpPath = path.join(__dirname, '../tmp')

// definindo pasta de upload
const upload = multer({ 
    dest: TmpPath, 
    limits: {
        fileSize: 1024 * 1024 * 1024 // limita para 1GB
    }
})

// criando pasta se não existir
if (!fs.existsSync(TmpPath)) {
    fs.mkdirSync(TmpPath, {recursive: true})
}

// exportações
module.exports = { upload, TmpPath }