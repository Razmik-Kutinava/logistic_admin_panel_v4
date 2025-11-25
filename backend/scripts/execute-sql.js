const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function executeSqlFile(filePath) {
  try {
    const fullPath = path.resolve(__dirname, '..', filePath);
    const sql = fs.readFileSync(fullPath, 'utf8');
    
    // Разбиваем SQL на отдельные команды (разделитель - точка с запятой)
    const commands = sql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Выполнение SQL файла: ${filePath}`);
    console.log(`Найдено команд: ${commands.length}`);
    
    for (const command of commands) {
      if (command.trim()) {
        try {
          await prisma.$executeRawUnsafe(command);
          console.log('✓ Команда выполнена');
        } catch (error) {
          // Игнорируем ошибки типа "уже существует" для IF NOT EXISTS
          if (error.message && error.message.includes('already exists')) {
            console.log('⚠ Объект уже существует, пропускаем');
          } else {
            console.error('✗ Ошибка выполнения команды:', error.message);
            throw error;
          }
        }
      }
    }
    
    console.log('✓ SQL файл успешно выполнен');
  } catch (error) {
    console.error('Ошибка выполнения SQL файла:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const sqlFile = process.argv[2] || 'prisma/migrations/add_domains.sql';
executeSqlFile(sqlFile);

