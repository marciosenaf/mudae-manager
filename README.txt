Mudae Manager para XAMPP

1. Extraia esta pasta em:
C:\xampp\htdocs\mudae-manager-xampp-full

2. Inicie Apache no XAMPP.

3. Abra:
http://localhost/mudae-manager-xampp-full/

Arquivos principais:
- index.php: interface
- app.js: lógica do gerenciador
- styles.css: estilo
- api.php: leitura e gravação do JSON
- image_proxy.php: preview de imagem por proxy local
- data/mudae-db.json: banco atual
- data/backups/: backups

O projeto lê e salva diretamente o JSON no servidor local.
Use "Salvar no servidor" depois de editar.
