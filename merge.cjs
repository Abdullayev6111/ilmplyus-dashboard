const fs = require('fs');

const uzPath = './src/messages/uz.json';
const ruPath = './src/messages/ru.json';
const enPath = './src/messages/en.json';

const uz = JSON.parse(fs.readFileSync(uzPath, 'utf8'));
const ru = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// 1. Add "common" to en
if (!en.common) en.common = { noData: "No data found" };

// 2. Add "departments.notFound" to ru and en
if (!ru.departments) ru.departments = {};
if (!en.departments) en.departments = {};
if (!uz.departments) uz.departments = {};
if (!ru.departments.notFound) ru.departments.notFound = "Отделы не найдены";
if (!en.departments.notFound) en.departments.notFound = "Departments not found";
if (!uz.departments.notFound) uz.departments.notFound = "Bo'limlar topilmadi";

// 3. Add settings
uz.settingsGroup = {
  "mainTitle": "Sozlamalar",
  "pages": "Sahifalar",
  "pageColumnsTitle": " sahifasi ustunlari",
  "pageColumnsDesc": "Jadvalda ko'rinishi kerak bo'lgan ustunlarni belgilang",
  "confirm": "Tasdiqlash",
  "saveSuccess": "Sozlamalar muvaffaqiyatli saqlandi!",
  "close": "Yopish"
};
ru.settingsGroup = {
  "mainTitle": "Настройки",
  "pages": "Страницы",
  "pageColumnsTitle": " столбцы страницы",
  "pageColumnsDesc": "Выберите столбцы, которые должны отображаться в таблице",
  "confirm": "Подтвердить",
  "saveSuccess": "Настройки успешно сохранены!",
  "close": "Закрыть"
};
en.settingsGroup = {
  "mainTitle": "Settings",
  "pages": "Pages",
  "pageColumnsTitle": " page columns",
  "pageColumnsDesc": "Select the columns that should be visible in the table",
  "confirm": "Confirm",
  "saveSuccess": "Settings saved successfully!",
  "close": "Close"
};

// 4. Add missing user keys
if (!uz.users) uz.users = {};
if (!ru.users) ru.users = {};
if (!en.users) en.users = {};

uz.users.generatePasswordTooltip = "Yangi parol generatsiya qilish";
ru.users.generatePasswordTooltip = "Сгенерировать новый пароль";
en.users.generatePasswordTooltip = "Generate new password";

uz.users.passwordPlaceholder = "Parol kiriting yoki generatsiya qiling";
ru.users.passwordPlaceholder = "Введите пароль или сгенерируйте";
en.users.passwordPlaceholder = "Enter password or generate";

uz.users.pinflError = "14 ta raqam bo'lishi shart";
ru.users.pinflError = "Должно быть 14 цифр";
en.users.pinflError = "Must be 14 digits";

uz.users.imageLabel = "Profil uchun rasm png yoki jpg formatda max 5mb";
ru.users.imageLabel = "Изображение профиля (png или jpg, макс. 5мб)";
en.users.imageLabel = "Profile image in png or jpg format max 5mb";

uz.users.upload = "Yuklash";
ru.users.upload = "Загрузить";
en.users.upload = "Upload";

// 5. Add missing courses keys
if (!uz.courses) uz.courses = {};
if (!ru.courses) ru.courses = {};
if (!en.courses) en.courses = {};

uz.courses.editTitle = "Kursni tahrirlash";
ru.courses.editTitle = "Редактировать курс";
en.courses.editTitle = "Edit course";

uz.courses.addTitle = "Kurs qo'shish";
ru.courses.addTitle = "Добавить курс";
en.courses.addTitle = "Add course";

uz.courses.detailsTitle = "Kurs tafsilotlari";
ru.courses.detailsTitle = "Детали курса";
en.courses.detailsTitle = "Course details";

uz.courses.availableLevels = "MAVJUD DARAJALAR";
ru.courses.availableLevels = "ДОСТУПНЫЕ УРОВНИ";
en.courses.availableLevels = "AVAILABLE LEVELS";

uz.courses.back = "Qaytish";
ru.courses.back = "Назад";
en.courses.back = "Back";

// Sync all keys from uz to ru and en
function syncKeys(base, target) {
  for (let key in base) {
    if (typeof base[key] === 'object' && base[key] !== null) {
      if (!target[key]) target[key] = {};
      syncKeys(base[key], target[key]);
    } else {
      if (target[key] === undefined) {
        target[key] = base[key] + " (needs translation)";
      }
    }
  }
}

syncKeys(uz, ru);
syncKeys(uz, en);

fs.writeFileSync(uzPath, JSON.stringify(uz, null, 2));
fs.writeFileSync(ruPath, JSON.stringify(ru, null, 2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));

console.log("Translations merged successfully.");
