import type { TopicPack } from './types';

type TopicSeed = {
  key: string;
  faLabel: string;
  concept: string;
  token: string;
  quizCorrect: { id: string; text: string };
  quizWrong: Array<{ id: string; text: string }>;
  matchPairs: Array<[string, string, string, string]>; // leftId, leftLabel, rightId, rightLabel
  drag: Array<[string, string, string, string]>; // itemId, itemLabel, slotId, slotLabel
  blankTemplate: string;
  blankAnswer: string;
  blankAlts?: string[];
  bug: TopicPack['bug'];
  output: TopicPack['output'];
  blocks: TopicPack['blocks'];
  code: TopicPack['code'];
  html: TopicPack['html'];
  simCorrect: { id: string; label: string };
  simWrong: Array<{ id: string; label: string }>;
};

function pack(seed: TopicSeed): TopicPack {
  const options = [seed.quizCorrect, ...seed.quizWrong];
  return {
    key: seed.key,
    faLabel: seed.faLabel,
    concept: seed.concept,
    token: seed.token,
    quiz: {
      prompt: `در درس «${seed.faLabel}»، کدام گزینه درست‌تر است؟`,
      options,
      correctId: seed.quizCorrect.id,
    },
    match: {
      left: seed.matchPairs.map(([id, label]) => ({ id, label })),
      right: seed.matchPairs.map(([, , id, label]) => ({ id, label })),
      pairs: Object.fromEntries(seed.matchPairs.map(([l, , r]) => [l, r])),
    },
    drag: {
      items: seed.drag.map(([id, label]) => ({ id, label })),
      slots: seed.drag.map(([, , id, label]) => ({ id, label })),
      placements: Object.fromEntries(seed.drag.map(([item, , slot]) => [slot, item])),
    },
    blanks: {
      template: seed.blankTemplate,
      blankIds: ['b0'],
      answers: { b0: [seed.blankAnswer, ...(seed.blankAlts ?? [])] },
    },
    bug: seed.bug,
    output: seed.output,
    blocks: seed.blocks,
    code: seed.code,
    html: seed.html,
    sim: {
      steps: [
        {
          id: 'choice',
          prompt: `برای «${seed.faLabel}» بهترین اقدام چیست؟`,
          choices: [seed.simCorrect, ...seed.simWrong],
        },
      ],
      choices: { choice: seed.simCorrect.id },
    },
  };
}

const HTML_TOPICS: Record<string, TopicSeed> = {
  home: {
    key: 'html-home',
    faLabel: 'خانه HTML',
    concept: 'شروع مسیر ساخت صفحه با HTML',
    token: 'html',
    quizCorrect: { id: 'markup', text: 'HTML ساختار و محتوای صفحه را مشخص می‌کند' },
    quizWrong: [
      { id: 'style', text: 'HTML فقط برای رنگ‌آمیزی است' },
      { id: 'db', text: 'HTML پایگاه‌داده را مدیریت می‌کند' },
      { id: 'os', text: 'HTML سیستم‌عامل مرورگر است' },
    ],
    matchPairs: [
      ['html', 'HTML', 'struct', 'ساختار محتوا'],
      ['css', 'CSS', 'look', 'ظاهر صفحه'],
      ['js', 'JavaScript', 'behavior', 'رفتار تعاملی'],
    ],
    drag: [
      ['doc', 'اعلان سند', 'doctype', '<!DOCTYPE html>'],
      ['root', 'ریشه صفحه', 'html', '<html>'],
      ['body', 'بدنه دیدنی', 'body', '<body>'],
    ],
    blankTemplate: '<!DOCTYPE ___>',
    blankAnswer: 'html',
    blankAlts: ['HTML'],
    bug: {
      language: 'html',
      prompt: 'سند بدون اعلان درست کامل نیست. اصلاحش کن.',
      buggyCode: '<html>\n  <body><p>سلام</p></body>\n</html>',
      mustMatch: ['<!DOCTYPE\\s+html>', '<html', '<body'],
      mustNotMatch: [],
    },
    output: {
      language: 'html',
      code: '<!-- خروجی دیدنی از body می‌آید -->\n<body><p>Kia</p></body>',
      expected: ['kia', 'Kia'],
    },
    blocks: {
      blocks: [
        { id: 'doctype', code: '<!DOCTYPE html>' },
        { id: 'html', code: '<html>' },
        { id: 'body', code: '<body></body>' },
      ],
      order: ['doctype', 'html', 'body'],
    },
    code: {
      language: 'html',
      prompt: 'یک صفحه حداقلی با html و body بنویس.',
      starter: '<!DOCTYPE html>\n<html>\n  <body>\n    \n  </body>\n</html>',
      mustMatch: ['<html', '<body'],
    },
    html: {
      prompt: 'صفحه‌ای با یک پاراگراف بساز.',
      starter: '<!DOCTYPE html>\n<html>\n<body>\n  <p></p>\n</body>\n</html>',
      checks: [{ tag: 'p', min: 1 }],
    },
    simCorrect: { id: 'start', label: 'اول ساختار HTML را درست می‌چینم' },
    simWrong: [
      { id: 'skip', label: 'مستقیم سراغ انیمیشن می‌روم' },
      { id: 'db', label: 'اول سرور را پیکربندی می‌کنم' },
    ],
  },
  headings: {
    key: 'html-headings',
    faLabel: 'عنوان‌ها',
    concept: 'سلسله‌مراتب عنوان با h1 تا h6',
    token: 'h1',
    quizCorrect: { id: 'h1', text: 'h1' },
    quizWrong: [
      { id: 'p', text: 'p' },
      { id: 'div', text: 'div' },
      { id: 'span', text: 'span' },
    ],
    matchPairs: [
      ['h1', 'h1', 'main', 'عنوان اصلی صفحه'],
      ['h2', 'h2', 'section', 'عنوان بخش'],
      ['p', 'p', 'text', 'متن پاراگراف'],
    ],
    drag: [
      ['title', 'عنوان صفحه', 'h1', 'h1'],
      ['text', 'یک پاراگراف', 'p', 'p'],
      ['link', 'پیوند', 'a', 'a'],
    ],
    blankTemplate: '<___>عنوان اصلی</___>',
    blankAnswer: 'h1',
    bug: {
      language: 'html',
      prompt: 'عنوان اصلی باید h1 باشد نه h7.',
      buggyCode: '<h7>سلام کیا</h7>',
      mustMatch: ['<h1[\\s>]', '</h1>'],
      mustNotMatch: ['<h7'],
    },
    output: { language: 'html', code: '<h1>Academy</h1>', expected: ['academy', 'Academy'] },
    blocks: {
      blocks: [
        { id: 'open', code: '<h1>' },
        { id: 'text', code: 'سلام' },
        { id: 'close', code: '</h1>' },
      ],
      order: ['open', 'text', 'close'],
    },
    code: {
      language: 'html',
      prompt: 'یک h1 با متن معنادار بنویس.',
      starter: '<h1></h1>',
      mustMatch: ['<h1', '</h1>'],
    },
    html: {
      prompt: 'عنوان و پاراگراف با کلمه سلام بساز.',
      starter: '<h1></h1>\n<p></p>',
      checks: [
        { tag: 'h1', min: 1 },
        { tag: 'p', min: 1, textIncludes: 'سلام' },
      ],
    },
    simCorrect: { id: 'one-h1', label: 'در هر صفحه معمولاً یک h1 اصلی می‌گذارم' },
    simWrong: [
      { id: 'many', label: 'ده تا h1 پشت سر هم می‌گذارم' },
      { id: 'skip', label: 'عنوان را فقط با CSS درشت می‌کنم' },
    ],
  },
  paragraphs: {
    key: 'html-paragraphs',
    faLabel: 'پاراگراف',
    concept: 'متن پیوسته با برچسب p',
    token: 'p',
    quizCorrect: { id: 'p', text: '<p> برای بند متن است' },
    quizWrong: [
      { id: 'br', text: '<br> جایگزین کامل پاراگراف است' },
      { id: 'h1', text: '<h1> فقط برای متن عادی است' },
      { id: 'img', text: '<img> متن را نگه می‌دارد' },
    ],
    matchPairs: [
      ['p', '<p>', 'para', 'بند متن'],
      ['br', '<br>', 'break', 'شکستن خط'],
      ['hr', '<hr>', 'rule', 'خط جداکننده'],
    ],
    drag: [
      ['lead', 'متن معرفی', 'p', '<p>'],
      ['break', 'خط جدید', 'br', '<br>'],
      ['rule', 'جداکننده', 'hr', '<hr>'],
    ],
    blankTemplate: '<___>متن درس</___>',
    blankAnswer: 'p',
    bug: {
      language: 'html',
      prompt: 'پاراگراف باید با p بسته شود.',
      buggyCode: '<p>متن ناقص<span>',
      mustMatch: ['<p[\\s>]', '</p>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<p>Hello</p>', expected: ['hello', 'Hello'] },
    blocks: {
      blocks: [
        { id: 'o', code: '<p>' },
        { id: 't', code: 'متن' },
        { id: 'c', code: '</p>' },
      ],
      order: ['o', 't', 'c'],
    },
    code: {
      language: 'html',
      prompt: 'دو پاراگراف پشت سر هم بنویس.',
      starter: '<p></p>\n<p></p>',
      mustMatch: ['<p', '</p>'],
    },
    html: {
      prompt: 'حداقل یک پاراگراف با متن واقعی بساز.',
      starter: '<p></p>',
      checks: [{ tag: 'p', min: 1 }],
    },
    simCorrect: { id: 'p', label: 'متن را داخل <p> می‌گذارم' },
    simWrong: [
      { id: 'div-only', label: 'همه‌چیز را فقط با div می‌نویسم' },
      { id: 'pre', label: 'متن عادی را داخل <script> می‌گذارم' },
    ],
  },
  links: {
    key: 'html-links',
    faLabel: 'پیوندها',
    concept: 'ایجاد لینک با a و href',
    token: 'a',
    quizCorrect: { id: 'href', text: 'آدرس مقصد در ویژگی href است' },
    quizWrong: [
      { id: 'src', text: 'آدرس پیوند همیشه در src است' },
      { id: 'alt', text: 'alt مقصد لینک را مشخص می‌کند' },
      { id: 'rel', text: 'rel جای href را می‌گیرد' },
    ],
    matchPairs: [
      ['a', '<a>', 'link', 'پیوند'],
      ['href', 'href', 'url', 'آدرس مقصد'],
      ['target', 'target', 'tab', 'نحوه باز شدن'],
    ],
    drag: [
      ['label', 'متن لینک', 'a', '<a>'],
      ['url', 'آدرس', 'href', 'href'],
      ['newtab', 'تب جدید', 'blank', '_blank'],
    ],
    blankTemplate: '<a ___="https://kia.academy">کیا</a>',
    blankAnswer: 'href',
    bug: {
      language: 'html',
      prompt: 'پیوند بدون href کار نمی‌کند.',
      buggyCode: '<a>کیا آکادمی</a>',
      mustMatch: ['<a[^>]*href\\s*=', '</a>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<a href="/">Home</a>', expected: ['home', 'Home'] },
    blocks: {
      blocks: [
        { id: 'a', code: '<a' },
        { id: 'href', code: 'href="/">' },
        { id: 'text', code: 'خانه</a>' },
      ],
      order: ['a', 'href', 'text'],
    },
    code: {
      language: 'html',
      prompt: 'یک پیوند با href بنویس.',
      starter: '<a href=""></a>',
      mustMatch: ['<a', 'href'],
    },
    html: {
      prompt: 'پیوندی با متن کیا بساز.',
      starter: '<a href="https://kia.academy"></a>',
      checks: [{ tag: 'a', min: 1, textIncludes: 'کیا' }],
    },
    simCorrect: { id: 'href', label: 'مقصد را در href می‌گذارم و متن واضح می‌نویسم' },
    simWrong: [
      { id: 'js', label: 'به‌جای لینک فقط alert می‌گذارم' },
      { id: 'empty', label: 'a بدون متن و بدون href می‌گذارم' },
    ],
  },
  images: {
    key: 'html-images',
    faLabel: 'تصاویر',
    concept: 'نمایش تصویر با img و alt',
    token: 'img',
    quizCorrect: { id: 'alt', text: 'alt جایگزین متنی تصویر است' },
    quizWrong: [
      { id: 'title-only', text: 'فقط title برای دسترس‌پذیری کافی است' },
      { id: 'no-src', text: 'بدون src هم تصویر لود می‌شود' },
      { id: 'div', text: 'تصویر را باید با <p> آورد' },
    ],
    matchPairs: [
      ['img', '<img>', 'image', 'تصویر'],
      ['src', 'src', 'path', 'مسیر فایل'],
      ['alt', 'alt', 'text', 'متن جایگزین'],
    ],
    drag: [
      ['photo', 'عکس محصول', 'img', '<img>'],
      ['path', 'آدرس فایل', 'src', 'src'],
      ['desc', 'توضیح کوتاه', 'alt', 'alt'],
    ],
    blankTemplate: '<img src="logo.png" ___="لوگوی کیا">',
    blankAnswer: 'alt',
    bug: {
      language: 'html',
      prompt: 'تصویر بدون alt دسترس‌پذیر نیست.',
      buggyCode: '<img src="hero.png">',
      mustMatch: ['<img[^>]*src\\s*=', 'alt\\s*='],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<img src="a.png" alt="Logo">', expected: ['logo', 'Logo'] },
    blocks: {
      blocks: [
        { id: 'img', code: '<img' },
        { id: 'src', code: 'src="a.png"' },
        { id: 'alt', code: 'alt="لوگو">' },
      ],
      order: ['img', 'src', 'alt'],
    },
    code: {
      language: 'html',
      prompt: 'img با src و alt بنویس.',
      starter: '<img src="" alt="">',
      mustMatch: ['<img', 'src', 'alt'],
    },
    html: {
      prompt: 'یک تصویر با alt معنادار بگذار.',
      starter: '<img src="cover.jpg" alt="">',
      checks: [{ tag: 'img', min: 1 }],
    },
    simCorrect: { id: 'alt', label: 'همیشه alt توصیفی می‌نویسم' },
    simWrong: [
      { id: 'empty-alt', label: 'alt را خالی می‌گذارم حتی برای تصویر مهم' },
      { id: 'bg', label: 'محتوای اصلی را فقط با background می‌آورم' },
    ],
  },
  lists: {
    key: 'html-lists',
    faLabel: 'فهرست‌ها',
    concept: 'فهرست مرتب و نامرتب',
    token: 'ul',
    quizCorrect: { id: 'li', text: 'آیتم‌های فهرست داخل li هستند' },
    quizWrong: [
      { id: 'td', text: 'آیتم فهرست را با td می‌نویسند' },
      { id: 'option', text: 'ul فقط option می‌پذیرد' },
      { id: 'span', text: 'li لازم نیست' },
    ],
    matchPairs: [
      ['ul', '<ul>', 'unordered', 'فهرست نامرتب'],
      ['ol', '<ol>', 'ordered', 'فهرست مرتب'],
      ['li', '<li>', 'item', 'آیتم'],
    ],
    drag: [
      ['bullets', 'گلوله', 'ul', '<ul>'],
      ['numbers', 'شماره', 'ol', '<ol>'],
      ['row', 'یک آیتم', 'li', '<li>'],
    ],
    blankTemplate: '<ul><___>آیتم</___></ul>',
    blankAnswer: 'li',
    bug: {
      language: 'html',
      prompt: 'آیتم باید li باشد نه p داخل ul.',
      buggyCode: '<ul><p>یک</p></ul>',
      mustMatch: ['<ul', '<li', '</li>', '</ul>'],
      mustNotMatch: ['<ul>\\s*<p'],
    },
    output: { language: 'html', code: '<ul><li>One</li></ul>', expected: ['one', 'One'] },
    blocks: {
      blocks: [
        { id: 'ul', code: '<ul>' },
        { id: 'li', code: '<li>آیتم</li>' },
        { id: 'end', code: '</ul>' },
      ],
      order: ['ul', 'li', 'end'],
    },
    code: {
      language: 'html',
      prompt: 'یک ul با حداقل یک li بنویس.',
      starter: '<ul>\n  \n</ul>',
      mustMatch: ['<ul', '<li'],
    },
    html: {
      prompt: 'فهرستی با دو آیتم بساز.',
      starter: '<ul>\n  <li></li>\n  <li></li>\n</ul>',
      checks: [
        { tag: 'ul', min: 1 },
        { tag: 'li', min: 2 },
      ],
    },
    simCorrect: { id: 'li', label: 'محتوای فهرست را داخل li می‌چینم' },
    simWrong: [
      { id: 'bare', label: 'متن را مستقیم داخل ul می‌گذارم' },
      { id: 'table', label: 'برای هر فهرست جدول می‌سازم' },
    ],
  },
  tables: {
    key: 'html-tables',
    faLabel: 'جدول',
    concept: 'ردیف و سلول با table',
    token: 'table',
    quizCorrect: { id: 'tr', text: 'هر ردیف با tr ساخته می‌شود' },
    quizWrong: [
      { id: 'li', text: 'ردیف جدول همان li است' },
      { id: 'section', text: 'جدول فقط با section ساخته می‌شود' },
      { id: 'img', text: 'سلول جدول img است' },
    ],
    matchPairs: [
      ['table', '<table>', 'grid', 'جدول'],
      ['tr', '<tr>', 'row', 'ردیف'],
      ['td', '<td>', 'cell', 'سلول'],
    ],
    drag: [
      ['sheet', 'جدول', 'table', '<table>'],
      ['row', 'ردیف', 'tr', '<tr>'],
      ['cell', 'سلول', 'td', '<td>'],
    ],
    blankTemplate: '<table><tr><___>داده</___></tr></table>',
    blankAnswer: 'td',
    bug: {
      language: 'html',
      prompt: 'سلول باید td باشد.',
      buggyCode: '<table><tr><span>۱</span></tr></table>',
      mustMatch: ['<table', '<tr', '<td', '</td>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<table><tr><td>A</td></tr></table>', expected: ['a', 'A'] },
    blocks: {
      blocks: [
        { id: 'table', code: '<table><tr>' },
        { id: 'td', code: '<td>A</td>' },
        { id: 'end', code: '</tr></table>' },
      ],
      order: ['table', 'td', 'end'],
    },
    code: {
      language: 'html',
      prompt: 'جدول یک‌سلولی بنویس.',
      starter: '<table>\n  <tr>\n    \n  </tr>\n</table>',
      mustMatch: ['<table', '<tr', '<td'],
    },
    html: {
      prompt: 'جدولی با یک td بساز.',
      starter: '<table><tr><td></td></tr></table>',
      checks: [
        { tag: 'table', min: 1 },
        { tag: 'td', min: 1 },
      ],
    },
    simCorrect: { id: 'data', label: 'جدول را برای دادهٔ جدولی به‌کار می‌برم' },
    simWrong: [
      { id: 'layout', label: 'کل چیدمان صفحه را با جدول می‌سازم' },
      { id: 'css', label: 'به‌جای داده، انیمیشن CSS داخل td می‌گذارم' },
    ],
  },
  forms: {
    key: 'html-forms',
    faLabel: 'فرم‌ها',
    concept: 'جمع‌آوری ورودی کاربر',
    token: 'form',
    quizCorrect: { id: 'name', text: 'name نام فیلد ارسال‌شده را مشخص می‌کند' },
    quizWrong: [
      { id: 'id-only', text: 'فقط id برای ارسال فرم کافی است' },
      { id: 'class', text: 'class مقدار را به سرور می‌فرستد' },
      { id: 'alt', text: 'alt جایگزین name است' },
    ],
    matchPairs: [
      ['form', '<form>', 'wrap', 'محفظه فرم'],
      ['input', '<input>', 'field', 'فیلد ورودی'],
      ['label', '<label>', 'caption', 'برچسب فیلد'],
    ],
    drag: [
      ['box', 'فرم', 'form', '<form>'],
      ['field', 'ورودی', 'input', '<input>'],
      ['caption', 'برچسب', 'label', '<label>'],
    ],
    blankTemplate: '<form><input type="text" ___="email"></form>',
    blankAnswer: 'name',
    bug: {
      language: 'html',
      prompt: 'ورودی باید داخل form باشد و name داشته باشد.',
      buggyCode: '<input type="text">',
      mustMatch: ['<form', 'name\\s*=', '</form>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<form><button>Send</button></form>', expected: ['send', 'Send'] },
    blocks: {
      blocks: [
        { id: 'form', code: '<form>' },
        { id: 'input', code: '<input name="q">' },
        { id: 'end', code: '</form>' },
      ],
      order: ['form', 'input', 'end'],
    },
    code: {
      language: 'html',
      prompt: 'فرمی با یک input بنویس.',
      starter: '<form>\n  \n</form>',
      mustMatch: ['<form', '<input'],
    },
    html: {
      prompt: 'فرم با input و button بساز.',
      starter: '<form>\n  <input name="q" />\n  <button>ارسال</button>\n</form>',
      checks: [
        { tag: 'form', min: 1 },
        { tag: 'input', min: 1 },
        { tag: 'button', min: 1 },
      ],
    },
    simCorrect: { id: 'label', label: 'برای هر ورودی label واضح می‌گذارم' },
    simWrong: [
      { id: 'placeholder', label: 'فقط placeholder را جای برچسب می‌گذارم' },
      { id: 'no-name', label: 'name را حذف می‌کنم چون ظاهر مهم‌تر است' },
    ],
  },
  semantics: {
    key: 'html-semantics',
    faLabel: 'عناصر معنایی',
    concept: 'header، main، footer و معنی ساختار',
    token: 'main',
    quizCorrect: { id: 'main', text: 'main محتوای اصلی یکتا را مشخص می‌کند' },
    quizWrong: [
      { id: 'div', text: 'div همیشه از main بهتر است' },
      { id: 'span', text: 'span ساختار صفحه را معنایی می‌کند' },
      { id: 'br', text: 'br بخش‌بندی معنایی است' },
    ],
    matchPairs: [
      ['header', '<header>', 'top', 'سرصفحه'],
      ['main', '<main>', 'core', 'محتوای اصلی'],
      ['footer', '<footer>', 'bottom', 'پاصفحه'],
    ],
    drag: [
      ['top', 'سرصفحه', 'header', '<header>'],
      ['core', 'محتوا', 'main', '<main>'],
      ['bottom', 'پاصفحه', 'footer', '<footer>'],
    ],
    blankTemplate: '<___>محتوای اصلی</___>',
    blankAnswer: 'main',
    bug: {
      language: 'html',
      prompt: 'محتوای اصلی را به main ببر.',
      buggyCode: '<div class="main"><h1>کیا</h1></div>',
      mustMatch: ['<main', '</main>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<main><h1>Kia</h1></main>', expected: ['kia', 'Kia'] },
    blocks: {
      blocks: [
        { id: 'header', code: '<header></header>' },
        { id: 'main', code: '<main></main>' },
        { id: 'footer', code: '<footer></footer>' },
      ],
      order: ['header', 'main', 'footer'],
    },
    code: {
      language: 'html',
      prompt: 'ساختار معنایی حداقلی بنویس.',
      starter: '<header></header>\n<main></main>\n<footer></footer>',
      mustMatch: ['<header', '<main', '<footer'],
    },
    html: {
      prompt: 'صفحه با header و main و h1 بساز.',
      starter: '<header></header>\n<main><h1></h1></main>',
      checks: [
        { tag: 'header', min: 1 },
        { tag: 'main', min: 1 },
        { tag: 'h1', min: 1 },
      ],
    },
    simCorrect: { id: 'semantic', label: 'از برچسب معنایی به‌جای div بی‌معنا استفاده می‌کنم' },
    simWrong: [
      { id: 'all-div', label: 'همه‌چیز را div می‌کنم' },
      { id: 'table', label: 'چیدمان معنایی را با table می‌سازم' },
    ],
  },
  media: {
    key: 'html-media',
    faLabel: 'رسانه',
    concept: 'ویدیو و صدا در صفحه',
    token: 'video',
    quizCorrect: { id: 'controls', text: 'controls کنترل‌های پخش را نشان می‌دهد' },
    quizWrong: [
      { id: 'alt', text: 'alt ویدیو را پخش می‌کند' },
      { id: 'href', text: 'href منبع ویدیو است' },
      { id: 'rel', text: 'rel جای controls را می‌گیرد' },
    ],
    matchPairs: [
      ['video', '<video>', 'movie', 'ویدیو'],
      ['audio', '<audio>', 'sound', 'صدا'],
      ['source', '<source>', 'file', 'منبع فایل'],
    ],
    drag: [
      ['movie', 'ویدیو', 'video', '<video>'],
      ['sound', 'صدا', 'audio', '<audio>'],
      ['file', 'فایل', 'source', '<source>'],
    ],
    blankTemplate: '<video ___ src="clip.mp4"></video>',
    blankAnswer: 'controls',
    bug: {
      language: 'html',
      prompt: 'به ویدیو controls اضافه کن.',
      buggyCode: '<video src="a.mp4"></video>',
      mustMatch: ['<video[^>]*controls', '</video>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: '<audio controls>Play</audio>', expected: ['play', 'Play'] },
    blocks: {
      blocks: [
        { id: 'v', code: '<video' },
        { id: 'c', code: 'controls' },
        { id: 's', code: 'src="a.mp4"></video>' },
      ],
      order: ['v', 'c', 's'],
    },
    code: {
      language: 'html',
      prompt: 'یک video با controls بنویس.',
      starter: '<video src="lesson.mp4"></video>',
      mustMatch: ['<video', 'controls'],
    },
    html: {
      prompt: 'ویدیویی با controls بساز.',
      starter: '<video controls src="lesson.mp4"></video>',
      checks: [{ tag: 'video', min: 1 }],
    },
    simCorrect: { id: 'controls', label: 'controls و منبع معتبر می‌گذارم' },
    simWrong: [
      { id: 'auto-mute', label: 'بدون کنترل، با صدای خودکار پخش می‌کنم' },
      { id: 'gif', label: 'هر ویدیویی را به gif اجباری تبدیل می‌کنم' },
    ],
  },
  canvas: {
    key: 'html-canvas',
    faLabel: 'بوم Canvas',
    concept: 'رسم گرافیک روی canvas',
    token: 'canvas',
    quizCorrect: { id: 'canvas', text: 'canvas یک سطح رسم بیت‌مپ است' },
    quizWrong: [
      { id: 'svg-only', text: 'canvas همان svg است' },
      { id: 'img', text: 'canvas فقط برچسب تصویر است' },
      { id: 'table', text: 'canvas جدول پنهان می‌سازد' },
    ],
    matchPairs: [
      ['canvas', '<canvas>', 'bitmap', 'بوم بیت‌مپ'],
      ['svg', '<svg>', 'vector', 'گرافیک برداری'],
      ['ctx', 'getContext', 'api', 'دسترسی به قلم'],
    ],
    drag: [
      ['board', 'بوم', 'canvas', '<canvas>'],
      ['size', 'اندازه', 'wh', 'width/height'],
      ['pen', 'قلم', 'ctx', 'getContext'],
    ],
    blankTemplate: '<canvas id="board" width="300" height="___"></canvas>',
    blankAnswer: '150',
    blankAlts: ['150px'],
    bug: {
      language: 'html',
      prompt: 'برچسب canvas را درست کن.',
      buggyCode: '<canvass width="100" height="100"></canvass>',
      mustMatch: ['<canvas', '</canvas>'],
      mustNotMatch: ['<canvass'],
    },
    output: { language: 'html', code: '<canvas id="c"></canvas>', expected: ['c'] },
    blocks: {
      blocks: [
        { id: 'c', code: '<canvas' },
        { id: 'w', code: 'width="200"' },
        { id: 'h', code: 'height="100"></canvas>' },
      ],
      order: ['c', 'w', 'h'],
    },
    code: {
      language: 'html',
      prompt: 'یک canvas با ابعاد بنویس.',
      starter: '<canvas width="200" height="100"></canvas>',
      mustMatch: ['<canvas', 'width', 'height'],
    },
    html: {
      prompt: 'canvas با id بساز.',
      starter: '<canvas id="board" width="200" height="100"></canvas>',
      checks: [{ tag: 'canvas', min: 1 }],
    },
    simCorrect: { id: 'ctx', label: 'با getContext قلم را می‌گیرم و رسم می‌کنم' },
    simWrong: [
      { id: 'css-draw', label: 'فکر می‌کنم CSS خودش روی canvas شکل می‌کشد' },
      { id: 'innerhtml', label: 'شکل را با innerHTML داخل canvas می‌گذارم' },
    ],
  },
  accessibility: {
    key: 'html-accessibility',
    faLabel: 'دسترس‌پذیری',
    concept: 'صفحه قابل استفاده برای همه',
    token: 'aria',
    quizCorrect: { id: 'alt', text: 'متن جایگزین و برچسب واضح ضروری‌اند' },
    quizWrong: [
      { id: 'color-only', text: 'فقط رنگ برای انتقال معنی کافی است' },
      { id: 'no-label', text: 'فرم بدون label بهتر است' },
      { id: 'flash', text: 'چشمک‌زدن زیاد دسترس‌پذیری را بالا می‌برد' },
    ],
    matchPairs: [
      ['alt', 'alt', 'img', 'توضیح تصویر'],
      ['label', 'label', 'input', 'نام فیلد'],
      ['button', 'button', 'action', 'اقدام واضح'],
    ],
    drag: [
      ['text', 'متن جایگزین', 'alt', 'alt'],
      ['name', 'برچسب فیلد', 'label', 'label'],
      ['role', 'نقش', 'aria', 'ARIA'],
    ],
    blankTemplate: '<img src="a.png" ___="نمودار فروش">',
    blankAnswer: 'alt',
    bug: {
      language: 'html',
      prompt: 'دکمه باید متن دسترس‌پذیر داشته باشد.',
      buggyCode: '<button></button>',
      mustMatch: ['<button[^>]*>\\s*\\S+', '</button>'],
      mustNotMatch: ['<button>\\s*</button>'],
    },
    output: { language: 'html', code: '<button>Save</button>', expected: ['save', 'Save'] },
    blocks: {
      blocks: [
        { id: 'label', code: '<label for="q">' },
        { id: 'text', code: 'جستجو</label>' },
        { id: 'input', code: '<input id="q">' },
      ],
      order: ['label', 'text', 'input'],
    },
    code: {
      language: 'html',
      prompt: 'دکمه‌ای با متن واضح بنویس.',
      starter: '<button></button>',
      mustMatch: ['<button', '</button>'],
    },
    html: {
      prompt: 'تصویر با alt و دکمه با متن بساز.',
      starter: '<img src="a.png" alt="نمودار">\n<button>ذخیره</button>',
      checks: [
        { tag: 'img', min: 1 },
        { tag: 'button', min: 1, textIncludes: 'ذخیره' },
      ],
    },
    simCorrect: { id: 'labels', label: 'برچسب، alt و کنتراست را جدی می‌گیرم' },
    simWrong: [
      { id: 'mouse', label: 'فقط برای ماوس طراحی می‌کنم' },
      { id: 'color', label: 'معنی را فقط با رنگ می‌رسانم' },
    ],
  },
};

const CSS_TOPICS: Record<string, TopicSeed> = {
  introduction: {
    key: 'css-intro',
    faLabel: 'مقدمه CSS',
    concept: 'جدا کردن ظاهر از ساختار',
    token: 'color',
    quizCorrect: { id: 'style', text: 'CSS ظاهر عناصر را کنترل می‌کند' },
    quizWrong: [
      { id: 'db', text: 'CSS داده‌ها را ذخیره می‌کند' },
      { id: 'route', text: 'CSS مسیر URL را می‌سازد' },
      { id: 'sql', text: 'CSS همان SQL است' },
    ],
    matchPairs: [
      ['color', 'color', 'paint', 'رنگ متن'],
      ['margin', 'margin', 'space', 'فاصله بیرونی'],
      ['display', 'display', 'box', 'نحوه نمایش جعبه'],
    ],
    drag: [
      ['paint', 'رنگ متن', 'color', 'color'],
      ['space', 'فاصله بیرونی', 'margin', 'margin'],
      ['box', 'نمایش جعبه', 'display', 'display'],
    ],
    blankTemplate: 'h1 { color: ___; }',
    blankAnswer: 'teal',
    bug: {
      language: 'css',
      prompt: 'ویژگی ناشناخته colour را درست کن.',
      buggyCode: 'h1 {\n  colour: teal;\n}',
      mustMatch: ['color\\s*:'],
      mustNotMatch: ['colour\\s*:'],
    },
    output: { language: 'css', code: '/* مقدار پیشنهادی */\ncolor: red;', expected: ['red'] },
    blocks: {
      blocks: [
        { id: 'sel', code: 'h1 {' },
        { id: 'decl', code: 'color: teal;' },
        { id: 'end', code: '}' },
      ],
      order: ['sel', 'decl', 'end'],
    },
    code: {
      language: 'css',
      prompt: 'رنگ h1 را تنظیم کن.',
      starter: 'h1 {\n  \n}',
      mustMatch: ['h1', 'color\\s*:'],
    },
    html: {
      prompt: 'یک h1 برای استایل‌دهی بگذار.',
      starter: '<h1 class="hero">کیا</h1>',
      checks: [{ tag: 'h1', min: 1 }],
    },
    simCorrect: { id: 'separate', label: 'ظاهر را در CSS جدا از HTML نگه می‌دارم' },
    simWrong: [
      { id: 'inline-all', label: 'همه استایل‌ها را inline می‌کنم' },
      { id: 'table', label: 'با جدول ظاهر را کنترل می‌کنم' },
    ],
  },
  selectors: {
    key: 'css-selectors',
    faLabel: 'انتخابگرها',
    concept: 'هدف‌گیری عنصر برای استایل',
    token: '.class',
    quizCorrect: { id: 'class', text: '.class عناصر هم‌کلاس را انتخاب می‌کند' },
    quizWrong: [
      { id: 'hash-class', text: '. برای id است' },
      { id: 'star-id', text: '# همه عناصر را می‌گیرد' },
      { id: 'tag-id', text: 'نام تگ همان id است' },
    ],
    matchPairs: [
      ['tag', 'h1', 'element', 'انتخاب عنصر'],
      ['class', '.card', 'group', 'انتخاب کلاس'],
      ['id', '#main', 'unique', 'انتخاب یکتا'],
    ],
    drag: [
      ['el', 'عنوان', 'tag', 'h1'],
      ['group', 'کارت‌ها', 'class', '.card'],
      ['one', 'بنر', 'id', '#hero'],
    ],
    blankTemplate: '___.title { font-weight: bold; }',
    blankAnswer: 'h1',
    blankAlts: ['.', 'p'],
    bug: {
      language: 'css',
      prompt: 'انتخابگر کلاس باید با نقطه شروع شود.',
      buggyCode: 'card {\n  color: navy;\n}',
      mustMatch: ['\\.card\\s*\\{', 'color\\s*:'],
      mustNotMatch: [],
    },
    output: { language: 'css', code: '.ok { color: green; }', expected: ['green'] },
    blocks: {
      blocks: [
        { id: 'sel', code: '.card {' },
        { id: 'decl', code: 'padding: 8px;' },
        { id: 'end', code: '}' },
      ],
      order: ['sel', 'decl', 'end'],
    },
    code: {
      language: 'css',
      prompt: 'یک قاعده با انتخابگر کلاس بنویس.',
      starter: '.card {\n  \n}',
      mustMatch: ['\\.card', ':'],
    },
    html: {
      prompt: 'عنصری با class برای انتخاب بساز.',
      starter: '<div class="card">کارت</div>',
      checks: [{ tag: 'div', min: 1 }],
    },
    simCorrect: { id: 'specific', label: 'انتخابگر را تا حد نیاز خاص می‌کنم' },
    simWrong: [
      { id: 'important', label: 'برای همه‌چیز !important می‌گذارم' },
      { id: 'star', label: 'همیشه با * همه را هدف می‌گیرم' },
    ],
  },
  flex: {
    key: 'css-flex',
    faLabel: 'فلکس‌باکس',
    concept: 'چیدمان یک‌بعدی منعطف',
    token: 'flex',
    quizCorrect: { id: 'display', text: 'display: flex ظرف فلکس می‌سازد' },
    quizWrong: [
      { id: 'float', text: 'float همان فلکس است' },
      { id: 'grid-only', text: 'فلکس فقط دو‌بعدی است' },
      { id: 'position', text: 'position: flex درست است' },
    ],
    matchPairs: [
      ['display', 'display: flex', 'container', 'ظرف فلکس'],
      ['justify', 'justify-content', 'main', 'توزیع محور اصلی'],
      ['align', 'align-items', 'cross', 'تراز محور عرضی'],
    ],
    drag: [
      ['row', 'ردیف افقی', 'flex', 'display: flex'],
      ['between', 'فاصله مساوی', 'justify', 'justify-content'],
      ['center', 'وسط چین', 'align', 'align-items'],
    ],
    blankTemplate: '.row { display: ___; }',
    blankAnswer: 'flex',
    bug: {
      language: 'css',
      prompt: 'ظرف باید display: flex بگیرد.',
      buggyCode: '.row {\n  display: block;\n  justify-content: center;\n}',
      mustMatch: ['display\\s*:\\s*flex'],
      mustNotMatch: [],
    },
    output: { language: 'css', code: 'display: flex;', expected: ['flex'] },
    blocks: {
      blocks: [
        { id: 'sel', code: '.row {' },
        { id: 'decl', code: 'display: flex;' },
        { id: 'end', code: '}' },
      ],
      order: ['sel', 'decl', 'end'],
    },
    code: {
      language: 'css',
      prompt: 'یک ظرف فلکس بنویس.',
      starter: '.row {\n  \n}',
      mustMatch: ['display\\s*:\\s*flex'],
    },
    html: {
      prompt: 'چند آیتم برای فلکس بساز.',
      starter: '<div class="row"><div>۱</div><div>۲</div></div>',
      checks: [{ tag: 'div', min: 2 }],
    },
    simCorrect: { id: 'one-axis', label: 'برای چیدمان یک‌محوره سراغ فلکس می‌روم' },
    simWrong: [
      { id: 'float', label: 'همه‌چیز را با float می‌چینم' },
      { id: 'absolute', label: 'برای لیست ساده absolute می‌گذارم' },
    ],
  },
  grid: {
    key: 'css-grid',
    faLabel: 'گرید',
    concept: 'چیدمان دو‌بعدی',
    token: 'grid',
    quizCorrect: { id: 'grid', text: 'display: grid ظرف شبکه‌ای می‌سازد' },
    quizWrong: [
      { id: 'flex-2d', text: 'فلکس جایگزین کامل گرید دو‌بعدی است' },
      { id: 'table', text: 'grid همان table است' },
      { id: 'inline', text: 'inline همیشه گرید می‌سازد' },
    ],
    matchPairs: [
      ['grid', 'display: grid', 'container', 'ظرف شبکه'],
      ['cols', 'grid-template-columns', 'columns', 'ستون‌ها'],
      ['gap', 'gap', 'space', 'فاصله خانه‌ها'],
    ],
    drag: [
      ['board', 'شبکه', 'grid', 'display: grid'],
      ['cols', '۳ ستون', 'template', 'grid-template-columns'],
      ['space', 'فاصله', 'gap', 'gap'],
    ],
    blankTemplate: '.layout { display: ___; }',
    blankAnswer: 'grid',
    bug: {
      language: 'css',
      prompt: 'display را روی grid بگذار.',
      buggyCode: '.layout {\n  display: block;\n  grid-template-columns: 1fr 1fr;\n}',
      mustMatch: ['display\\s*:\\s*grid'],
      mustNotMatch: [],
    },
    output: { language: 'css', code: 'display: grid;', expected: ['grid'] },
    blocks: {
      blocks: [
        { id: 'sel', code: '.layout {' },
        { id: 'decl', code: 'display: grid;' },
        { id: 'end', code: '}' },
      ],
      order: ['sel', 'decl', 'end'],
    },
    code: {
      language: 'css',
      prompt: 'ظرف گرید با دو ستون بنویس.',
      starter: '.layout {\n  \n}',
      mustMatch: ['display\\s*:\\s*grid', 'grid-template-columns'],
    },
    html: {
      prompt: 'چند سلول برای گرید بساز.',
      starter: '<div class="layout"><div></div><div></div><div></div></div>',
      checks: [{ tag: 'div', min: 3 }],
    },
    simCorrect: { id: 'two-axis', label: 'برای ردیف و ستون هم‌زمان سراغ گرید می‌روم' },
    simWrong: [
      { id: 'nested-flex', label: 'ده لایه فلکس تو در تو می‌سازم' },
      { id: 'table', label: 'به جدول HTML برمی‌گردم' },
    ],
  },
  box: {
    key: 'css-box',
    faLabel: 'مدل جعبه',
    concept: 'content، padding، border، margin',
    token: 'padding',
    quizCorrect: { id: 'padding', text: 'padding فاصله داخل مرز است' },
    quizWrong: [
      { id: 'margin-in', text: 'margin داخل border است' },
      { id: 'border-out', text: 'border بیرون از margin است' },
      { id: 'outline-pad', text: 'outline جایگزین padding است' },
    ],
    matchPairs: [
      ['content', 'content', 'core', 'محتوا'],
      ['padding', 'padding', 'inner', 'فاصله درونی'],
      ['margin', 'margin', 'outer', 'فاصله بیرونی'],
    ],
    drag: [
      ['inner', 'فضای درونی', 'padding', 'padding'],
      ['edge', 'لبه', 'border', 'border'],
      ['outer', 'فضای بیرونی', 'margin', 'margin'],
    ],
    blankTemplate: '.card { padding: ___; }',
    blankAnswer: '16px',
    blankAlts: ['16px;', '1rem'],
    bug: {
      language: 'css',
      prompt: 'padding را درست بنویس.',
      buggyCode: '.card {\n  paddding: 16px;\n}',
      mustMatch: ['padding\\s*:'],
      mustNotMatch: ['paddding'],
    },
    output: { language: 'css', code: 'margin: 8px;', expected: ['8px'] },
    blocks: {
      blocks: [
        { id: 'sel', code: '.card {' },
        { id: 'decl', code: 'padding: 16px;' },
        { id: 'end', code: '}' },
      ],
      order: ['sel', 'decl', 'end'],
    },
    code: {
      language: 'css',
      prompt: 'padding و margin را تنظیم کن.',
      starter: '.card {\n  \n}',
      mustMatch: ['padding\\s*:', 'margin\\s*:'],
    },
    html: {
      prompt: 'کارت برای تمرین مدل جعبه.',
      starter: '<div class="card">محتوا</div>',
      checks: [{ tag: 'div', min: 1, textIncludes: 'محتوا' }],
    },
    simCorrect: { id: 'box', label: 'قبل از چیدمان پیچیده، مدل جعبه را چک می‌کنم' },
    simWrong: [
      { id: 'guess', label: 'با حدس margin منفی همه‌چیز را جبران می‌کنم' },
      { id: 'important', label: 'روی هر ضلع !important می‌گذارم' },
    ],
  },
  responsive: {
    key: 'css-responsive',
    faLabel: 'واکنش‌گرایی',
    concept: 'سازگاری با عرض‌های مختلف',
    token: '@media',
    quizCorrect: { id: 'media', text: '@media استایل را بر اساس شرایط صفحه عوض می‌کند' },
    quizWrong: [
      { id: 'script', text: 'فقط با JS می‌توان واکنش‌گرا شد' },
      { id: 'table', text: 'جدول واکنش‌گرایی را تضمین می‌کند' },
      { id: 'zoom', text: 'zoom مرورگر همان RWD است' },
    ],
    matchPairs: [
      ['viewport', 'viewport', 'meta', 'پنجره نمایش'],
      ['media', '@media', 'query', 'شرط عرض'],
      ['fluid', '% / fr', 'flexible', 'اندازه منعطف'],
    ],
    drag: [
      ['meta', 'viewport', 'viewport', 'meta viewport'],
      ['query', 'شرط', 'media', '@media'],
      ['fluid', 'عرض منعطف', 'width', 'max-width'],
    ],
    blankTemplate: '@media (max-width: ___) { .nav { display: none; } }',
    blankAnswer: '600px',
    blankAlts: ['600px)', '40rem'],
    bug: {
      language: 'css',
      prompt: 'دستور media را درست کن.',
      buggyCode: '@meida (max-width: 600px) {\n  .nav { display: none; }\n}',
      mustMatch: ['@media'],
      mustNotMatch: ['@meida'],
    },
    output: { language: 'css', code: '@media (max-width: 600px) {}', expected: ['600px'] },
    blocks: {
      blocks: [
        { id: 'm', code: '@media (max-width: 600px) {' },
        { id: 'r', code: '.nav { display: none; }' },
        { id: 'e', code: '}' },
      ],
      order: ['m', 'r', 'e'],
    },
    code: {
      language: 'css',
      prompt: 'یک media query ساده بنویس.',
      starter: '@media (max-width: 600px) {\n  \n}',
      mustMatch: ['@media', 'max-width'],
    },
    html: {
      prompt: 'viewport را در head بگذار.',
      starter: '<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
      checks: [{ tag: 'meta', min: 1 }],
    },
    simCorrect: { id: 'mobile', label: 'از موبایل به دسکتاپ محتوا را اولویت‌بندی می‌کنم' },
    simWrong: [
      { id: 'fixed', label: 'عرض ثابت ۹۶۰px برای همه دستگاه‌ها' },
      { id: 'zoom', label: 'از کاربر می‌خواهم زوم کند' },
    ],
  },
};

const JS_TOPICS: Record<string, TopicSeed> = {
  introduction: {
    key: 'js-intro',
    faLabel: 'مقدمه جاوااسکریپت',
    concept: 'اضافه کردن رفتار به صفحه',
    token: 'console',
    quizCorrect: { id: 'behavior', text: 'جاوااسکریپت رفتار تعاملی صفحه را می‌سازد' },
    quizWrong: [
      { id: 'only-style', text: 'فقط برای رنگ دکمه است' },
      { id: 'html', text: 'جایگزین کامل HTML است' },
      { id: 'db', text: 'همان پایگاه‌داده مرورگر است' },
    ],
    matchPairs: [
      ['let', 'let', 'mutable', 'متغیر قابل تغییر'],
      ['const', 'const', 'fixed', 'ثابت'],
      ['fn', 'function', 'action', 'عمل قابل فراخوانی'],
    ],
    drag: [
      ['name', 'نام', 'const', 'const'],
      ['bind', 'مقداردهی', 'eq', '='],
      ['value', 'مقدار', 'val', "'کیا'"],
    ],
    blankTemplate: 'const name = ___;',
    blankAnswer: "'کیا'",
    blankAlts: ['"کیا"', "'Kia'", '"Kia"'],
    bug: {
      language: 'javascript',
      prompt: 'ثابت را با const درست اعلام کن.',
      buggyCode: "cost name = 'Kia';",
      mustMatch: ['const\\s+name'],
      mustNotMatch: ['\\bcost\\b'],
    },
    output: {
      language: 'javascript',
      code: 'console.log(2 + 3)',
      expected: ['5'],
    },
    blocks: {
      blocks: [
        { id: 'const', code: 'const' },
        { id: 'name', code: 'name =' },
        { id: 'value', code: "'کیا'" },
      ],
      order: ['const', 'name', 'value'],
    },
    code: {
      language: 'javascript',
      prompt: 'تابع greet را تعریف کن که چیزی return کند.',
      starter: 'function greet() {\n  \n}',
      mustDeclareFunctions: ['greet'],
      mustMatch: ['return'],
    },
    html: {
      prompt: 'دکمه‌ای برای اتصال اسکریپت بساز.',
      starter: '<button id="go">برو</button>',
      checks: [{ tag: 'button', min: 1 }],
    },
    simCorrect: { id: 'progressive', label: 'اول HTML درست، بعد رفتار JS' },
    simWrong: [
      { id: 'inline', label: 'همه منطق را در onclick غول‌پیکر می‌گذارم' },
      { id: 'eval', label: 'از eval برای همه‌چیز استفاده می‌کنم' },
    ],
  },
  variables: {
    key: 'js-variables',
    faLabel: 'متغیرها',
    concept: 'نام‌گذاری و نگه‌داری مقدار',
    token: 'let',
    quizCorrect: { id: 'name', text: 'متغیر نامی برای نگه‌داشتن یک مقدار است' },
    quizWrong: [
      { id: 'color', text: 'فقط یک رنگ در CSS است' },
      { id: 'image', text: 'یک فایل تصویری است' },
      { id: 'tag', text: 'یک برچسب HTML است' },
    ],
    matchPairs: [
      ['let', 'let', 'reassign', 'قابل تغییر'],
      ['const', 'const', 'constant', 'ثابت مرجع'],
      ['var', 'var', 'legacy', 'اعلان قدیمی‌تر'],
    ],
    drag: [
      ['keyword', 'کلیدواژه', 'let', 'let'],
      ['id', 'شناسه', 'name', 'score'],
      ['val', 'مقدار', 'value', '10'],
    ],
    blankTemplate: 'let score = ___;',
    blankAnswer: '10',
    bug: {
      language: 'javascript',
      prompt: 'اعلان متغیر را درست کن.',
      buggyCode: 'lett score = 10;',
      mustMatch: ['\\b(let|const)\\s+score'],
      mustNotMatch: ['\\blett\\b'],
    },
    output: {
      language: 'javascript',
      code: 'const x = 1;\nconsole.log(x + 2);',
      expected: ['3'],
    },
    blocks: {
      blocks: [
        { id: 'let', code: 'let' },
        { id: 'name', code: 'score =' },
        { id: 'value', code: '10' },
      ],
      order: ['let', 'name', 'value'],
    },
    code: {
      language: 'javascript',
      prompt: 'متغیر score را اعلام کن.',
      starter: '',
      mustMatch: ['\\b(let|const)\\s+score'],
    },
    html: {
      prompt: 'جایگاه نمایش امتیاز.',
      starter: '<span id="score">0</span>',
      checks: [{ tag: 'span', min: 1 }],
    },
    simCorrect: { id: 'const-default', label: 'پیش‌فرض const؛ فقط در صورت نیاز let' },
    simWrong: [
      { id: 'var-all', label: 'همه‌چیز را var می‌کنم' },
      { id: 'global', label: 'همه متغیرها را سراسری می‌گذارم' },
    ],
  },
  functions: {
    key: 'js-functions',
    faLabel: 'توابع',
    concept: 'بسته‌بندی منطق قابل فراخوانی',
    token: 'function',
    quizCorrect: { id: 'reuse', text: 'تابع منطق قابل استفاده مجدد می‌سازد' },
    quizWrong: [
      { id: 'css', text: 'تابع فقط یک ویژگی CSS است' },
      { id: 'once', text: 'تابع را نمی‌توان دوباره صدا زد' },
      { id: 'html', text: 'تابع همان برچسب HTML است' },
    ],
    matchPairs: [
      ['decl', 'function name()', 'define', 'تعریف'],
      ['call', 'name()', 'invoke', 'فراخوانی'],
      ['ret', 'return', 'result', 'خروجی'],
    ],
    drag: [
      ['kw', 'کلیدواژه', 'fn', 'function'],
      ['id', 'نام', 'name', 'greet'],
      ['body', 'بدنه', 'return', 'return'],
    ],
    blankTemplate: 'function greet() { return ___; }',
    blankAnswer: "'سلام'",
    blankAlts: ['"سلام"', "'hi'", '"hi"'],
    bug: {
      language: 'javascript',
      prompt: 'نام تابع و return را درست کن.',
      buggyCode: 'function greett() {\n  retrun "hi";\n}',
      mustMatch: ['function\\s+greet\\s*\\(', 'return'],
      mustNotMatch: ['retrun', 'greett'],
    },
    output: {
      language: 'javascript',
      code: 'function add(a,b){return a+b}\nconsole.log(add(2,3))',
      expected: ['5'],
    },
    blocks: {
      blocks: [
        { id: 'fn', code: 'function greet() {' },
        { id: 'ret', code: "return 'hi';" },
        { id: 'end', code: '}' },
      ],
      order: ['fn', 'ret', 'end'],
    },
    code: {
      language: 'javascript',
      prompt: 'تابع greet با return بنویس.',
      starter: 'function greet() {\n  \n}',
      mustDeclareFunctions: ['greet'],
      mustMatch: ['return'],
    },
    html: {
      prompt: 'دکمه فراخوانی.',
      starter: '<button onclick="greet()">سلام</button>',
      checks: [{ tag: 'button', min: 1 }],
    },
    simCorrect: { id: 'small', label: 'توابع کوچک و تک‌مسئولیتی می‌نویسم' },
    simWrong: [
      { id: 'god', label: 'یک تابع هزارخطی برای همه‌چیز' },
      { id: 'copy', label: 'کد را ده بار کپی می‌کنم' },
    ],
  },
  arrays: {
    key: 'js-arrays',
    faLabel: 'آرایه‌ها',
    concept: 'فهرست مرتب مقادیر',
    token: 'array',
    quizCorrect: { id: 'index', text: 'ایندکس آرایه از صفر شروع می‌شود' },
    quizWrong: [
      { id: 'one', text: 'ایندکس از یک شروع می‌شود' },
      { id: 'key', text: 'آرایه فقط کلید رشته دارد' },
      { id: 'css', text: 'آرایه ویژگی CSS است' },
    ],
    matchPairs: [
      ['arr', '[1,2]', 'list', 'فهرست'],
      ['push', 'push', 'add', 'افزودن انتها'],
      ['len', 'length', 'size', 'طول'],
    ],
    drag: [
      ['list', 'فهرست', 'arr', '[]'],
      ['add', 'افزودن', 'push', 'push'],
      ['size', 'طول', 'length', 'length'],
    ],
    blankTemplate: 'const nums = [1, 2, ___];',
    blankAnswer: '3',
    bug: {
      language: 'javascript',
      prompt: 'آرایه را درست بنویس.',
      buggyCode: 'const nums = (1, 2, 3);',
      mustMatch: ['\\[\\s*1\\s*,\\s*2\\s*,\\s*3\\s*\\]'],
      mustNotMatch: [],
    },
    output: {
      language: 'javascript',
      code: 'console.log([10,20][0])',
      expected: ['10'],
    },
    blocks: {
      blocks: [
        { id: 'const', code: 'const nums =' },
        { id: 'open', code: '[' },
        { id: 'vals', code: '1, 2]' },
      ],
      order: ['const', 'open', 'vals'],
    },
    code: {
      language: 'javascript',
      prompt: 'آرایه nums را بساز.',
      starter: 'const nums = ',
      mustMatch: ['nums\\s*=\\s*\\['],
    },
    html: {
      prompt: 'فهرست برای رندر آرایه.',
      starter: '<ul id="list"></ul>',
      checks: [{ tag: 'ul', min: 1 }],
    },
    simCorrect: { id: 'map', label: 'برای تبدیل فهرست سراغ map/filter می‌روم' },
    simWrong: [
      { id: 'copy-paste', label: 'برای هر آیتم یک متغیر جدا می‌سازم' },
      { id: 'string', label: 'همه‌چیز را در یک رشته طولانی نگه می‌دارم' },
    ],
  },
  conditions: {
    key: 'js-conditions',
    faLabel: 'شرط‌ها',
    concept: 'انشعاب با if',
    token: 'if',
    quizCorrect: { id: 'if', text: 'if مسیر اجرا را بر اساس شرط عوض می‌کند' },
    quizWrong: [
      { id: 'for', text: 'for فقط برای شرط است' },
      { id: 'css', text: '@media جایگزین if در JS است' },
      { id: 'html', text: '<if> برچسب استاندارد است' },
    ],
    matchPairs: [
      ['if', 'if', 'branch', 'شاخه شرطی'],
      ['else', 'else', 'fallback', 'مسیر جایگزین'],
      ['cmp', '===', 'compare', 'مقایسه اکید'],
    ],
    drag: [
      ['kw', 'شرط', 'if', 'if'],
      ['test', 'آزمون', 'cmp', '==='],
      ['alt', 'وگرنه', 'else', 'else'],
    ],
    blankTemplate: 'if (score ___ 10) { pass(); }',
    blankAnswer: '>=',
    blankAlts: ['>', '==='],
    bug: {
      language: 'javascript',
      prompt: 'کلمه کلیدی if را درست کن.',
      buggyCode: 'iff (ready) {\n  start();\n}',
      mustMatch: ['\\bif\\s*\\('],
      mustNotMatch: ['\\biff\\b'],
    },
    output: {
      language: 'javascript',
      code: 'console.log(5 > 3)',
      expected: ['true'],
    },
    blocks: {
      blocks: [
        { id: 'if', code: 'if (ok) {' },
        { id: 'body', code: 'go();' },
        { id: 'end', code: '}' },
      ],
      order: ['if', 'body', 'end'],
    },
    code: {
      language: 'javascript',
      prompt: 'یک if با بدنه بنویس.',
      starter: 'const ok = true;\n',
      mustMatch: ['\\bif\\s*\\('],
    },
    html: {
      prompt: 'پیام وضعیت.',
      starter: '<p id="status"></p>',
      checks: [{ tag: 'p', min: 1 }],
    },
    simCorrect: { id: 'clear', label: 'شرط‌ها را خوانا و بدون تودرتوی زیاد می‌نویسم' },
    simWrong: [
      { id: 'nested', label: 'ده if تو در تو بدون نیاز' },
      { id: 'assign', label: 'در شرط از = به‌جای === استفاده می‌کنم' },
    ],
  },
  loops: {
    key: 'js-loops',
    faLabel: 'حلقه‌ها',
    concept: 'تکرار کارها',
    token: 'for',
    quizCorrect: { id: 'for', text: 'for برای تکرار مشخص مناسب است' },
    quizWrong: [
      { id: 'once', text: 'حلقه فقط یک‌بار اجرا می‌شود' },
      { id: 'css', text: 'حلقه یک ویژگی CSS است' },
      { id: 'html', text: '<loop> استاندارد HTML است' },
    ],
    matchPairs: [
      ['for', 'for', 'counted', 'تکرار شمارشی'],
      ['while', 'while', 'until', 'تا وقتی شرط'],
      ['map', 'map', 'transform', 'تبدیل آرایه'],
    ],
    drag: [
      ['count', 'شمارشی', 'for', 'for'],
      ['cond', 'شرطی', 'while', 'while'],
      ['each', 'روی آرایه', 'forof', 'for...of'],
    ],
    blankTemplate: 'for (let i = 0; i < 3; i___) {}',
    blankAnswer: '++',
    blankAlts: ['+= 1'],
    bug: {
      language: 'javascript',
      prompt: 'حلقه for را درست کن.',
      buggyCode: 'fro (let i = 0; i < 3; i++) {\n  console.log(i);\n}',
      mustMatch: ['\\bfor\\s*\\('],
      mustNotMatch: ['\\bfro\\b'],
    },
    output: {
      language: 'javascript',
      code: 'let s=0; for(let i=0;i<3;i++) s++;\nconsole.log(s)',
      expected: ['3'],
    },
    blocks: {
      blocks: [
        { id: 'for', code: 'for (let i = 0; i < 3; i++) {' },
        { id: 'body', code: 'console.log(i);' },
        { id: 'end', code: '}' },
      ],
      order: ['for', 'body', 'end'],
    },
    code: {
      language: 'javascript',
      prompt: 'یک حلقه for بنویس.',
      starter: '',
      mustMatch: ['\\bfor\\s*\\('],
    },
    html: {
      prompt: 'لیست برای پر شدن در حلقه.',
      starter: '<ul id="items"></ul>',
      checks: [{ tag: 'ul', min: 1 }],
    },
    simCorrect: { id: 'bound', label: 'شرط پایان حلقه را واضح می‌گذارم' },
    simWrong: [
      { id: 'infinite', label: 'حلقه بی‌پایان عمدی بدون نیاز' },
      { id: 'copy', label: 'به‌جای حلقه کد را ۳۰ بار کپی می‌کنم' },
    ],
  },
  dom: {
    key: 'js-dom',
    faLabel: 'DOM',
    concept: 'ارتباط اسکریپت با عناصر صفحه',
    token: 'querySelector',
    quizCorrect: { id: 'qs', text: 'querySelector عنصر را از سند برمی‌دارد' },
    quizWrong: [
      { id: 'css', text: 'DOM فقط فایل CSS است' },
      { id: 'sql', text: 'DOM کوئری پایگاه‌داده است' },
      { id: 'json', text: 'DOM همان JSON است' },
    ],
    matchPairs: [
      ['qs', 'querySelector', 'find', 'پیدا کردن عنصر'],
      ['text', 'textContent', 'content', 'متن عنصر'],
      ['listen', 'addEventListener', 'event', 'شنیدن رویداد'],
    ],
    drag: [
      ['find', 'انتخاب', 'qs', 'querySelector'],
      ['write', 'نوشتن متن', 'text', 'textContent'],
      ['click', 'کلیک', 'listen', 'addEventListener'],
    ],
    blankTemplate: "document.querySelector('___')",
    blankAnswer: '#app',
    blankAlts: ['.app', 'button', "'#app'", '"#app"'],
    bug: {
      language: 'javascript',
      prompt: 'نام API را درست کن.',
      buggyCode: "document.querySelectorr('#app');",
      mustMatch: ['querySelector\\s*\\('],
      mustNotMatch: ['querySelectorr'],
    },
    output: {
      language: 'javascript',
      code: 'console.log(document ? "dom" : "no")',
      expected: ['dom'],
    },
    blocks: {
      blocks: [
        { id: 'doc', code: 'document' },
        { id: 'qs', code: ".querySelector('#app')" },
        { id: 'text', code: ".textContent = 'کیا'" },
      ],
      order: ['doc', 'qs', 'text'],
    },
    code: {
      language: 'javascript',
      prompt: 'عنصر را با querySelector بگیر.',
      starter: '',
      mustMatch: ['querySelector\\s*\\('],
    },
    html: {
      prompt: 'عنصر هدف DOM.',
      starter: '<div id="app">آماده</div>',
      checks: [{ tag: 'div', min: 1 }],
    },
    simCorrect: { id: 'listen', label: 'با listener به رویدادها واکنش می‌دهم' },
    simWrong: [
      { id: 'inline', label: 'منطق پیچیده را فقط در HTML onclick می‌گذارم' },
      { id: 'timer-dom', label: 'بدون دلیل کل DOM را هر میلی‌ثانیه بازنویسی می‌کنم' },
    ],
  },
  async: {
    key: 'js-async',
    faLabel: 'ناهمگام',
    concept: 'کارهای زمان‌بر بدون قفل کردن UI',
    token: 'async',
    quizCorrect: { id: 'await', text: 'await منتظر Promise می‌ماند' },
    quizWrong: [
      { id: 'sync', text: 'async همه چیز را همزمان قطعی می‌کند' },
      { id: 'css', text: 'async یک ویژگی CSS است' },
      { id: 'html', text: '<async> برچسب استاندارد است' },
    ],
    matchPairs: [
      ['promise', 'Promise', 'future', 'نتیجه آینده'],
      ['await', 'await', 'wait', 'انتظار'],
      ['then', 'then', 'continue', 'ادامه بعد از موفقیت'],
    ],
    drag: [
      ['future', 'وعده', 'promise', 'Promise'],
      ['wait', 'انتظار', 'await', 'await'],
      ['ok', 'موفقیت', 'then', 'then'],
    ],
    blankTemplate: 'async function load() { return await ___; }',
    blankAnswer: 'fetch(url)',
    blankAlts: ['fetch(url);', 'Promise.resolve(1)'],
    bug: {
      language: 'javascript',
      prompt: 'async/await را درست کن.',
      buggyCode: 'asyn function load() {\n  await fetch("/api");\n}',
      mustMatch: ['async\\s+function', 'await\\s+'],
      mustNotMatch: ['\\basyn\\b'],
    },
    output: {
      language: 'javascript',
      code: 'Promise.resolve(7).then(console.log)',
      expected: ['7'],
    },
    blocks: {
      blocks: [
        { id: 'async', code: 'async function load() {' },
        { id: 'await', code: 'return await fetch("/api");' },
        { id: 'end', code: '}' },
      ],
      order: ['async', 'await', 'end'],
    },
    code: {
      language: 'javascript',
      prompt: 'یک تابع async بنویس که await داشته باشد.',
      starter: 'async function load() {\n  \n}',
      mustDeclareFunctions: ['load'],
      mustMatch: ['async', 'await'],
    },
    html: {
      prompt: 'وضعیت بارگذاری.',
      starter: '<p id="status">در حال بارگذاری…</p>',
      checks: [{ tag: 'p', min: 1 }],
    },
    simCorrect: { id: 'handle', label: 'خطای شبکه را با catch مدیریت می‌کنم' },
    simWrong: [
      { id: 'ignore', label: 'Promise را رها می‌کنم تا خاموش شکست بخورد' },
      { id: 'alert', label: 'برای هر درخواست alert می‌گذارم' },
    ],
  },
};

const BRANDING_TOPICS: Record<string, TopicSeed> = {
  'portfolio-story': {
    key: 'portfolio-story',
    faLabel: 'داستان پورتفولیو',
    concept: 'روایت پروژه با نتیجه',
    token: 'story',
    quizCorrect: { id: 'outcome', text: 'نتیجه و اثر را قبل از فهرست ابزار بگذار' },
    quizWrong: [
      { id: 'tools', text: 'فقط لیست ابزارها کافی است' },
      { id: 'wall', text: 'ده صفحه متن بدون ساختار بهتر است' },
      { id: 'hide', text: 'نقش خودت را مبهم نگه دار' },
    ],
    matchPairs: [
      ['context', 'Context', 'scene', 'صحنه و نقش'],
      ['problem', 'Problem', 'pain', 'درد کاربر'],
      ['result', 'Result', 'impact', 'نتیجه قابل اندازه‌گیری'],
    ],
    drag: [
      ['who', 'تو کیستی', 'hero', 'Hero'],
      ['work', 'چه ساختی', 'case', 'Case study'],
      ['proof', 'اثبات اثر', 'metric', 'Metric'],
    ],
    blankTemplate: 'در ۹۰ ثانیه اول، ___ را نشان بده.',
    blankAnswer: 'نتیجه',
    blankAlts: ['اثر', 'outcome', 'نتیجه کار'],
    bug: {
      language: 'html',
      prompt: 'عنوان پروژه باید واضح باشد.',
      buggyCode: '<h1></h1><p>چیزهایی ساختم</p>',
      mustMatch: ['<h1[^>]*>\\s*\\S+', '</h1>'],
      mustNotMatch: ['<h1>\\s*</h1>'],
    },
    output: { language: 'html', code: '<h1>+34% signup</h1>', expected: ['+34% signup', '+34%'] },
    blocks: {
      blocks: [
        { id: 'c', code: 'Context' },
        { id: 'p', code: 'Problem' },
        { id: 'r', code: 'Result' },
      ],
      order: ['c', 'p', 'r'],
    },
    code: {
      language: 'html',
      prompt: 'هیرو پورتفولیو با عنوان و خلاصه.',
      starter: '<header>\n  <h1></h1>\n  <p></p>\n</header>',
      mustMatch: ['<h1', '<p'],
    },
    html: {
      prompt: 'بخش هیرو با عنوان و یک جمله ارزش.',
      starter: '<header><h1></h1><p></p></header>',
      checks: [
        { tag: 'header', min: 1 },
        { tag: 'h1', min: 1 },
        { tag: 'p', min: 1 },
      ],
    },
    simCorrect: { id: 'story', label: 'داستان کوتاه با نتیجه مشخص تعریف می‌کنم' },
    simWrong: [
      { id: 'read', label: 'رزومه را کلمه به کلمه می‌خوانم' },
      { id: 'silent', label: 'سکوت می‌کنم تا سوال بعدی' },
    ],
  },
  'interview-framework': {
    key: 'interview-framework',
    faLabel: 'چارچوب مصاحبه',
    concept: 'پاسخ رفتاری با STAR',
    token: 'STAR',
    quizCorrect: { id: 'star', text: 'STAR یعنی Situation، Task، Action، Result' },
    quizWrong: [
      { id: 'tools', text: 'STAR یعنی لیست ابزارها' },
      { id: 'salary', text: 'STAR فقط درباره حقوق است' },
      { id: 'code', text: 'STAR یک الگوریتم مرتب‌سازی است' },
    ],
    matchPairs: [
      ['s', 'Situation', 'scene', 'صحنه'],
      ['t', 'Task', 'duty', 'مسئولیت تو'],
      ['a', 'Action', 'you', 'اقدام تو'],
      ['r', 'Result', 'impact', 'نتیجه'],
    ],
    drag: [
      ['scene', 'صحنه', 's', 'Situation'],
      ['duty', 'وظیفه', 't', 'Task'],
      ['impact', 'اثر', 'r', 'Result'],
    ],
    blankTemplate: 'در STAR حرف A یعنی ___.',
    blankAnswer: 'Action',
    blankAlts: ['اقدام', 'action'],
    bug: {
      language: 'html',
      prompt: 'نتیجه را در پاسخ برجسته کن.',
      buggyCode: '<p>کاری کردم.</p>',
      mustMatch: ['<p[^>]*>.*(نتیجه|٪|%|\\+|نتیجه)', '</p>'],
      mustNotMatch: [],
    },
    output: { language: 'html', code: 'Result: +20% retention', expected: ['+20% retention', '+20%'] },
    blocks: {
      blocks: [
        { id: 's', code: 'Situation' },
        { id: 't', code: 'Task' },
        { id: 'a', code: 'Action' },
        { id: 'r', code: 'Result' },
      ],
      order: ['s', 't', 'a', 'r'],
    },
    code: {
      language: 'html',
      prompt: 'چک‌لیست STAR را به‌صورت فهرست بنویس.',
      starter: '<ol>\n  <li>Situation</li>\n</ol>',
      mustMatch: ['<ol', '<li'],
    },
    html: {
      prompt: 'فهرست چهار مرحله STAR.',
      starter: '<ol><li>Situation</li><li>Task</li><li>Action</li><li>Result</li></ol>',
      checks: [
        { tag: 'ol', min: 1 },
        { tag: 'li', min: 4 },
      ],
    },
    simCorrect: { id: 'star', label: 'با Situation شروع می‌کنم و به Result می‌رسم' },
    simWrong: [
      { id: 'ramble', label: 'بدون ساختار ۱۰ دقیقه حرف می‌زنم' },
      { id: 'team', label: 'فقط می‌گویم تیم انجام داد، بدون نقش من' },
    ],
  },
};

/** Keyword → topic key per course family. */
const HTML_KEYWORD_MAP: Array<[RegExp, string]> = [
  [/heading/, 'headings'],
  [/paragraph/, 'paragraphs'],
  [/link/, 'links'],
  [/image|favicon|img/, 'images'],
  [/list/, 'lists'],
  [/table/, 'tables'],
  [/form|input/, 'forms'],
  [/semantic|layout|div|block|section|header/, 'semantics'],
  [/video|audio|media|youtube|svg|canvas/, 'media'],
  [/canvas/, 'canvas'],
  [/accessib/, 'accessibility'],
  [/home|intro|basic|element|attribute|editor|project|website|summary|quiz|exercise|challenge|bootcamp|syllabus|study|interview|cert|example/, 'home'],
];

const CSS_KEYWORD_MAP: Array<[RegExp, string]> = [
  [/flex/, 'flex'],
  [/grid/, 'grid'],
  [/selector|pseudo|combinator|specificity|important/, 'selectors'],
  [/box|margin|padding|border|outline|height|width|sizing/, 'box'],
  [/media|rwd|responsive|viewport/, 'responsive'],
  [/.*/, 'introduction'],
];

const JS_KEYWORD_MAP: Array<[RegExp, string]> = [
  [/function/, 'functions'],
  [/array|iteration|set|map(?!s)|typed/, 'arrays'],
  [/if|condition|operator|data-type|boolean/, 'conditions'],
  [/loop|while|for/, 'loops'],
  [/dom|event|browser|web-api|ajax|jquery/, 'dom'],
  [/async|promise|module|ajax|jsonp|timer/, 'async'],
  [/variable|let|const|scope|string|number|object|class|json|output|syntax|home|intro|where|project|example|debug|error|style|reference|version|advanced|old|graphic|meta|proxy|date|temporal|math|regexp/, 'variables'],
  [/.*/, 'introduction'],
];

function seedFromCourse(courseSlug: string, lessonSlug: string): TopicSeed {
  if (courseSlug === 'interview-branding') {
    return BRANDING_TOPICS[lessonSlug] ?? BRANDING_TOPICS['portfolio-story']!;
  }
  if (courseSlug === 'html') {
    for (const [re, key] of HTML_KEYWORD_MAP) {
      if (re.test(lessonSlug)) return HTML_TOPICS[key] ?? HTML_TOPICS.home!;
    }
    return HTML_TOPICS.home!;
  }
  if (courseSlug === 'css') {
    for (const [re, key] of CSS_KEYWORD_MAP) {
      if (re.test(lessonSlug)) return CSS_TOPICS[key] ?? CSS_TOPICS.introduction!;
    }
    return CSS_TOPICS.introduction!;
  }
  if (courseSlug === 'javascript') {
    for (const [re, key] of JS_KEYWORD_MAP) {
      if (re.test(lessonSlug)) return JS_TOPICS[key] ?? JS_TOPICS.introduction!;
    }
    return JS_TOPICS.introduction!;
  }
  return HTML_TOPICS.home!;
}

export function resolveTopic(courseSlug: string, lessonSlug: string, lessonTitle: string): TopicPack {
  const base = pack(seedFromCourse(courseSlug, lessonSlug));
  // Specialize label with the actual lesson title when helpful.
  const faLabel = lessonTitle && lessonTitle.length < 40 ? lessonTitle : base.faLabel;
  return {
    ...base,
    faLabel,
    quiz: {
      ...base.quiz,
      prompt: `ماموریت درس «${faLabel}»: گزینه درست را پیدا کن.`,
    },
  };
}
