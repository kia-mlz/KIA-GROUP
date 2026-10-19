import type { CourseDbEnLesson, CourseDbEnOverlay, CourseDbPlayground } from './types';

/**
 * English translations for the Persian-first `db.json` course catalog.
 *
 * Keyed by the numeric source ids in `db.json` (courses + lessons). Lesson
 * descriptions are the full English markdown body; playground entries override
 * only the starter code of lessons whose Persian starter contains Persian text.
 */
export const EN_COURSE_DESCRIPTIONS: Record<number, string> = {
  1: `HTML is the first step into the world of web design.
By learning HTML at KIA., you can easily build your own website and enjoy the process of creating it.`,
  2: `CSS is the standard language for styling and beautifying web pages.
By learning CSS at KIA., you will give your website a professional look and full control over colors, layout, and typography.`,
  3: `JavaScript is the programming language of the web. Learning it lets you add behavior and interactivity to your pages and build complete web applications.`,
};

/** English lesson bodies keyed by the db.json lesson id. */
export const EN_LESSON_DESCRIPTIONS: Record<number, string> = {
  1: `HTML stands for Hypertext Markup Language and is the standard markup language for structuring web pages.
HTML is not a programming language but a descriptive (markup) language that uses tags to define and organize the different parts of a page, such as text, images, links, and forms.
HTML builds the skeleton (structure) of a website.

HTML is the foundation of all web pages — without it, no displayable structure would exist in the browser. Its most important uses are:
    • Structuring web page content (headings, paragraphs, lists, etc.)
    • Creating links between pages (Hyperlinking)
    • Displaying images, video, and multimedia files
    • Building forms to collect user input
    • Defining the base structure for attaching CSS and JavaScript`,
  2: `Starting a project correctly — the basics of a proper setup and the first project:
Starting an HTML project properly plays a decisive role in its quality, extensibility, and overall order. Following the basic principles from the very beginning prevents disorder and problems in later stages of development.

Important principles when starting a project:
a) Orderly file structure
• Disorder from the start = an unmanageable project in the future.
b) Standard naming
• Use lowercase letters
• Use hyphens (-) instead of spaces

Creating a standard project structure:
As a first step, an organized structure must be created for the project, with a separate folder for each project.
• Create a folder named after the project (first_project).
• Create a file inside that folder named index with the html extension (index.html).
** In web projects, index refers to the file that is served by default as the entry point of a website. This file is usually saved as index.html. So the main file should always be named index.html, while other files can take names related to their own page. **
For example:
• about.html
• contact.html`,
  3: `To write code we need a coding environment — we either use code editors or IDEs.
Code editor: a lightweight, fast tool for writing and editing code. It has core features such as line numbering and simple search, but usually needs extensions for debugging, compiling, and project management (e.g. VS Code and Sublime Text).
IDE (Integrated Development Environment): a complete bundle including an editor, debugger, compiler, and project tools that provides everything from writing to testing in one place. It is designed for large projects (e.g. PyCharm and IntelliJ).

** In this course we use VS Code — a powerful, lightweight code editor that, with the right extensions, covers all our web design needs. **
Download and install VS Code from https://code.visualstudio.com/ and install the extensions listed below in VS Code.
1. Emmet
2. Prettier
3. Live Server
4. Auto Rename Tag
5. Auto Close Tag
6. HTML CSS Support
7. HTML Snippets / HTML Boilerplate
8. Highlight Matching Tag`,
  4: `Definition of a Tag
Each HTML instruction (code) is called a tag.

Definition of an Element in HTML
An HTML element consists of three main parts:
1. Start tag
2. Content
3. End tag
<tagname> Content... </tagname>
** Some elements in HTML have no closing tag (such as \`<img>\` or \`<br>\`); these are called *Empty Elements*. They have a different structure and are defined without content. **

Definition of an Attribute:
An attribute in HTML is a property used to add extra information to tags. Attributes determine the behavior or characteristics of an element.
** Attributes are always written inside the start tag. **
<tagname attribute='value'> … </tagname>`,
  5: `An element in HTML is the combination of an opening tag, content, and a closing tag.
An element is usually defined like this:
<tagname>content</tagname>

Types of elements in HTML:
    • Nested elements: elements placed inside another element.
    • Empty elements: elements without a closing tag, such as <br>, <hr>, and <img>.

** Browsers usually render the page even if a closing tag is forgotten, but it is always recommended to close tags properly to avoid possible errors. **`,
  6: `An attribute provides extra information about an HTML element and is always written in the start tag.
General syntax: <tagname attribute="value">content</tagname>

The most important global HTML attributes:
    • href: sets the link destination in the <a> tag
    • src: sets the path of an image or media file
    • width and height: set the dimensions of an image
    • alt: alternative text shown when the image cannot be displayed
    • style: adds inline CSS
    • title: shows a tooltip when hovering over the element

** Attribute values must always be enclosed in quotes (" "). **`,
  7: `Heading tags define the titles and section headings of a page and are available from h1 to h6.
<h1>Most important heading</h1>
<h6>Least important heading</h6>

Important notes:
    • h1 is usually used for the main page title and should be used only once per page.
    • Search engines use headings to understand the structure and content of a page, so they matter a lot for SEO.
    • Headings should never be used just to make text bigger or bolder; use CSS for that instead.`,
  8: `The <p> tag defines a paragraph in HTML, and the browser automatically adds a margin before and after each paragraph.
<p>This is a paragraph.</p>

Important notes:
    • Extra whitespace and newlines written in the code are ignored by the browser and collapse into a single space (HTML Whitespace Collapsing).
    • To create a new line without starting a new paragraph, use the <br> tag.
    • A <p> tag cannot contain other block tags such as <div> or <h1>.`,
  9: `The style attribute adds inline CSS directly to an HTML element.
<tagname style="property:value;">content</tagname>

The most common uses:
    • background-color: change the background color
    • color: change the text color
    • font-family: change the font
    • font-size: change the text size
    • text-align: set the text alignment

** Although inline styling is quick, it is not recommended; it is better to write styles in a separate CSS file to keep the code cleaner and more maintainable. **`,
  10: `HTML provides many tags for text formatting that also carry semantic meaning.
    • <b> and <strong>: bold text (strong also implies importance)
    • <i> and <em>: italic text (em implies emphasis)
    • <mark>: highlighted text
    • <small>: smaller text
    • <del>: deleted (struck-through) text
    • <ins>: inserted (underlined) text
    • <sub> and <sup>: subscript and superscript text

** Prefer <strong> and <em> for semantic importance, not just <b> and <i>, which are purely visual. **`,
  11: `HTML provides several dedicated tags for quotations:
    • <blockquote>: for long quotations, usually shown indented, with the cite attribute for the source.
    • <q>: for short inline quotations; the browser automatically adds quotation marks.
    • <abbr>: for abbreviations, with the full explanation in the title attribute.
    • <address>: for the contact information of an author or organization.
    • <cite>: for the title of a work (such as a book or article).
    • <bdo>: to override the text direction (Bi-Directional Override).`,
  12: `A comment in HTML is text written in the code that is not displayed in the browser output.
<!-- This is a comment -->

Uses of comments:
    • Explaining different parts of the code for better understanding by yourself or other developers
    • Temporarily disabling part of the code without deleting it (Commenting Out)
    • Documentation inside the file

** Comments can span multiple lines but cannot be nested. **`,
  13: `Colors in HTML and CSS are usually defined in one of four ways:
    • Color name: such as red or blue
    • HEX value: such as #ff0000
    • RGB value: such as rgb(255, 0, 0)
    • HSL value: such as hsl(0, 100%, 50%)

Opacity (alpha) can also be defined using RGBA and HSLA:
rgba(255, 0, 0, 0.5)

** The right color system depends on the project; HEX is the most common method in web design. **`,
  14: `CSS stands for Cascading Style Sheets and is used to style HTML elements; HTML builds the structure while CSS designs its appearance.

Three main ways to add CSS to HTML:
    1. Inline CSS: writing styles directly in the style attribute of a tag
    2. Internal CSS: writing styles inside a <style> tag in the <head> section
    3. External CSS: writing styles in a separate .css file and linking it with a <link> tag

** External CSS is recommended for real projects because it separates content from presentation and improves code maintainability. **`,
  15: `A hyperlink is created with the <a> tag and is used to connect pages to each other or to external resources.
<a href="https://example.com">Link text</a>

The most important attributes of the a tag:
    • href: the link destination address
    • target="_blank": opens the link in a new tab
    • title: shows a tooltip on hover
    • download: downloads the file instead of opening it

** Links can also point to a specific part of the same page (using # and an id), which is called a Bookmark Link. **`,
  16: `The <img> tag displays an image on the page and is an empty element, i.e. it has no closing tag.
<img src="image.jpg" alt="Image description" width="300" height="200">

The most important attributes:
    • src: the image file path (relative or absolute)
    • alt: alternative text if the image fails to load, used for accessibility
    • width and height: set the image dimensions to prevent layout shift

** Using alt is always recommended — both for accessibility and for better SEO. **`,
  17: `In this section a simple HTML project is built by combining the concepts learned so far (tags, attributes, links, and images).

Suggested steps for building the project:
    1. Create the project folder and index.html following the standard naming principles
    2. Design the main page structure with heading and paragraph tags
    3. Add related images and links
    4. Check the output in the browser using the Live Server extension

** Hands-on practice is the best way to solidify HTML fundamentals; try writing each part yourself from scratch. **`,
  18: `A favicon is the small icon displayed in the browser tab next to the page title, representing the site's visual identity.

How to add a favicon in the head section:
<link rel="icon" type="image/x-icon" href="favicon.ico">

Important notes:
    • The common favicon format is .ico, but png and svg formats are also supported.
    • The standard size is usually 16x16 or 32x32 pixels.
    • If not defined, some browsers automatically look for a favicon.ico file in the site root.`,
  19: `The page title is defined with the <title> tag inside the <head> section and is the text shown in the browser tab, search engine results, and bookmarks.
<head>
  <title>My Page Title</title>
</head>

Importance of the title tag:
    • Direct impact on SEO and search engine ranking
    • Helps users quickly identify the page among many open tabs
    • Shown as the clickable headline in Google results

** Every page should have a unique, descriptive title. **`,
  20: `A table in HTML is built with the <table> tag and consists of rows (<tr>) and cells (<td> or <th>).
<table>
  <tr><th>Name</th><th>Age</th></tr>
  <tr><td>Ali</td><td>25</td></tr>
</table>

Main parts of a table:
    • <table>: the main table element
    • <tr>: defines a table row
    • <th>: defines a table header cell, usually bold and centered
    • <td>: defines a table data cell
    • <caption>: the table title
    • <thead>, <tbody>, <tfoot>: semantic grouping of the table header, body, and footer`,
  21: `HTML provides three main types of lists:
    • Unordered list with the <ul> tag and items with <li>, displayed with bullets
    • Ordered list with the <ol> tag and items with <li>, displayed with numbers or letters
    • Description list with the <dl> tag, containing <dt> for the term and <dd> for the description

Example:
<ul>
  <li>First item</li>
  <li>Second item</li>
</ul>

** Lists can also be nested, i.e. a <ul> or <ol> can be placed inside the <li> of another element. **`,
  22: `HTML elements are divided into two categories based on their default display:
    • Block-level elements: always start on a new line and take up the full available width. Examples: <div>, <p>, <h1>, <ul>
    • Inline elements: only take up as much space as their content needs and continue on the same line. Examples: <span>, <a>, <strong>, <img>

** Using CSS and the display property, you can change the default display type of any element (e.g. inline-block or block). **`,
  23: `The <div> tag is a block-level, non-semantic element used to group other HTML elements and apply styles or scripts to that group.
<div class="container">
  <p>Content inside the div</p>
</div>

Common uses:
    • Building page sections such as header, sidebar, and footer (before semantic tags existed)
    • Grouping several elements to apply the same CSS styling
    • Creating layout structures with Flexbox or Grid

** Overusing meaningless divs is known as "Div Soup"; it is recommended to also use semantic tags such as <section> and <article>. **`,
  24: `The class attribute is used to select one or more elements and apply shared CSS styling or select them with JavaScript.
<p class="intro">Paragraph text</p>

How to use it in CSS:
.intro {
  color: blue;
}

Important notes:
    • An element can have multiple classes separated by spaces: class="intro bold"
    • Several different elements can share one class (unlike id, which must be unique)
    • In CSS, classes are selected with a dot (.)`,
  25: `The id attribute defines a unique identifier for an HTML element and must not be repeated anywhere on the page.
<h1 id="main-title">Main title</h1>

Uses of id:
    • Selecting and styling a specific element with CSS using the (#) sign
    • Quickly accessing the element in JavaScript with document.getElementById()
    • Creating internal links (Bookmark Links) to jump to a specific part of the page: <a href="#main-title">

** Unlike class, which can repeat, an id must be unique across the whole HTML document. **`,
  26: `The <button> tag creates clickable buttons that can trigger events such as submitting a form or running JavaScript code.
<button type="button" onclick="alert('Clicked!')">Click me</button>

Important values of the type attribute:
    • button: a plain button with no default behavior
    • submit: submits the form data
    • reset: clears the form values

** The <button> tag is more flexible than <input type="button"> because it can contain HTML content such as an icon or image. **`,
  27: `An iframe, created with the <iframe> tag, is used to display another web page inside the current page.
<iframe src="https://example.com" width="600" height="400"></iframe>

The most important attributes:
    • src: the address of the page to display
    • width and height: set the display dimensions
    • title: describes the iframe content for accessibility
    • allowfullscreen: allows full-screen display (for videos such as YouTube)

** For security reasons (such as Clickjacking attacks), many sites restrict being displayed in iframes on other sites. **`,
  28: `JavaScript is the language that adds behavior and interactivity to HTML pages, while HTML builds the structure and CSS styles the appearance.

Ways to add JavaScript to HTML:
    1. Internal: writing code inside a <script> tag on the page
    2. External: attaching a separate .js file using <script src="file.js"></script>

Simple example:
<script>
  document.write("Hello World");
</script>

** It is better to place the <script> tag at the end of the page body (before </body>) to increase the initial page load speed. **`,
  29: `A file path specifies the location of a file (image, page, or stylesheet) relative to the current file and comes in two main types:
    • Absolute path: the full file address including the domain, such as https://example.com/images/pic.jpg
    • Relative path: the file address relative to the current file's location

Common symbols in relative paths:
    • / : go to the site root
    • ../ : go up one folder
    • folder/file : go into a subfolder

** Relative paths are recommended for a project's internal files so links stay intact if the domain changes. **`,
  30: `The <head> section contains the page's metadata, which is not displayed directly on the page but matters to browsers and search engines.

The most important elements inside head:
    • <title>: the page title
    • <meta charset="UTF-8">: sets the character encoding
    • <meta name="description">: a short page description for SEO
    • <meta name="viewport">: responsive display settings on mobile
    • <link>: attaches external files such as CSS or the favicon
    • <style>: writes internal CSS
    • <script>: writes or attaches JavaScript`,
  31: `Layout in HTML refers to how the different sections of a page are organized and placed together.

Common ways to build a layout:
    • Using semantic tags such as <header>, <nav>, <main>, <section>, <aside>, <footer>
    • Using CSS Flexbox for one-dimensional layouts (row or column)
    • Using CSS Grid for two-dimensional layouts (rows and columns at once)
    • The older float or position approach, which is less recommended today

** The right layout method depends on the design complexity; for most modern projects, Flexbox and Grid are the primary choices. **`,
  32: `Responsive design means the page adapts its appearance to different screen sizes (mobile, tablet, desktop).

Key techniques:
    • Setting the viewport meta tag: <meta name="viewport" content="width=device-width, initial-scale=1.0">
    • Using relative units such as % instead of px for element widths
    • Using CSS Media Queries to apply different styles based on screen size
    • Using Flexbox and Grid for flexible layouts

** Responsive design is an essential requirement of modern websites, since most visitors use mobile devices. **`,
  33: `HTML provides several dedicated tags for displaying computer code, usually rendered in a monospace font:
    • <code>: displays a short snippet of code
    • <pre>: preserves spaces and newlines exactly as written in the code
    • <kbd>: displays keyboard input
    • <samp>: displays the output of a program or script
    • <var>: displays a variable name in math or programming

Example:
<pre><code>function hello() {
  console.log("Hello");
}</code></pre>`,
  34: `Semantic elements are elements that, in addition to structure, convey the meaning of their content to the browser and search engines.

The most important HTML5 semantic elements:
    • <header>: the page or section header
    • <nav>: the navigation menu section
    • <main>: the main page content (must be unique)
    • <section>: a thematic grouping of content
    • <article>: independent, self-contained content
    • <aside>: tangentially related content
    • <footer>: the page footer

** Using semantic elements instead of plain <div> improves SEO, accessibility, and code readability. **`,
  35: `Following a standard style guide when writing HTML code improves readability and consistency across development teams.

The most important HTML coding conventions:
    • Use lowercase for tag and attribute names
    • Always close tags, even empty ones like <br> or <img>
    • Use proper indentation to show element nesting
    • Quote attribute values
    • Declare the document type (<!DOCTYPE html>) at the top of every file
    • Keep CSS and JavaScript in separate files, apart from the HTML`,
  36: `HTML entities are codes used to display reserved or special characters that cannot be written directly in HTML.
Example:
    • &lt; displays the < character
    • &gt; displays the > character
    • &amp; displays the & character
    • &nbsp; displays a non-breaking space
    • &copy; displays the copyright symbol ©

** Entities usually start with & and end with ; and are used to avoid conflicts with the HTML structure. **`,
  37: `Symbols in HTML, like other special characters, can be displayed via entity codes or Unicode code points.
Example:
    • &euro; for the euro sign €
    • &deg; for the degree sign °
    • &hearts; for the heart ♥
    • &larr; and &rarr; for the left and right arrows

How to use a Unicode code:
&#9733; displays the star ★

** Using standard HTML symbols gives better cross-browser compatibility than pasting the raw special character. **`,
  38: `Emojis are Unicode characters and, like other text, can be written directly inside HTML or displayed via their Unicode code point.
Example:
<p>Hello 😀</p>
<p>&#128512;</p>

Important notes:
    • For emojis to render correctly, the page encoding must be UTF-8:
      <meta charset="UTF-8">
    • The final emoji appearance may vary depending on the user's operating system and browser.`,
  39: `A character set defines how characters are converted into bytes that can be stored and transmitted.
The common, recommended standard today is UTF-8, which supports virtually all languages and symbols in the world.

Declaring the encoding in HTML:
<meta charset="UTF-8">

** Not setting the correct encoding can cause Persian or other language characters to display incorrectly as question marks or garbled characters. **`,
  40: `URL encoding is the process of converting special or illegal characters in web addresses into a transmittable format.
Example:
    • A space is converted to %20
    • The & sign in parameters is converted to %26

** A URL can only contain standard ASCII characters; that is why non-English characters or special symbols must be encoded for the address to remain valid. **`,
  41: `XHTML is a stricter version of HTML that follows XML rules, while HTML has more flexible rules.

Main differences:
    • In XHTML all tags must be closed (even empty elements like <br/>)
    • In XHTML tag and attribute names must be lowercase
    • In XHTML every attribute value must be quoted
    • XHTML is much stricter about syntax errors; the smallest error stops the page from rendering

** Today HTML5 is the main web standard and the use of XHTML has declined. **`,
  42: `A form in HTML is used to collect information from the user and is defined with the <form> tag.
<form action="/submit" method="post">
  <input type="text" name="username">
  <button type="submit">Send</button>
</form>

Main parts of a form:
    • <input>: receives various kinds of input from the user
    • <label>: a descriptive label for each input
    • <select>: a dropdown menu for choosing an option
    • <textarea>: receives multi-line text
    • <button>: submits or resets the form

** Correctly connecting a label to an input with the for attribute improves accessibility. **`,
  43: `The attributes of the <form> tag determine how the form data is submitted and processed.

The most important attributes:
    • action: the address the form data is sent to
    • method: the submission method (get or post)
    • target: where to display the submission result (e.g. _blank)
    • autocomplete: enables or disables autofill
    • novalidate: disables the browser's automatic validation

GET vs POST:
    • GET: the data is sent in the URL and is suitable for non-sensitive data
        • POST: the data is sent in the request body and is better for sensitive or large data`,
  44: `HTML forms include various elements to collect different types of data from the user.

The most important form elements:
    • <input>: the most commonly used input element with different type values
    • <label>: the text label associated with an input
    • <select>: creates a dropdown list of options
    • <textarea>: a multi-line text input
    • <button>: creates a clickable button for form submission
    • <fieldset>: groups related elements
    • <legend>: provides a title for a group
    • <datalist>: provides auto-complete suggestions for an input
    • <output>: displays the result of a calculation`,
  45: `The type attribute on the <input> tag specifies what kind of data the user can enter.

The most important type values:
    • text: a simple one-line text input
    • password: a password input (characters are hidden)
    • email: for entering email addresses
    • number: for entering numeric values
    • date / datetime-local: date and time pickers
    • checkbox: creates a checkbox
    • radio: creates a radio button
    • submit: creates a submit button
    • button: creates a clickable button
    • file: allows file selection`,
  46: `The attributes of the <input> tag control behavior and the validation rules of the input.

The most important attributes:
    • name: identifies the input value when the form is submitted
    • value: the default value of the input
    • placeholder: a short hint shown when the input is empty
    • required: makes the input mandatory
    • min and max: define the numeric or date range
    • step: defines legal number intervals
    • readonly: input is read-only (value is submitted but cannot be edited)
    • disabled: input is disabled (value is not submitted)
    • maxlength: the maximum number of characters allowed
    • pattern: defines a regular expression for input validation
    • autocomplete: enables or disables browser autofill`,
  47: `In addition to input attributes, some attributes are applied directly on the <form> tag or shared across several form inputs.

The most important of these attributes:
    • form: connects an input to a form outside the form tag using its id
    • formaction: overrides the form's action value for a specific button
    • formmethod: overrides the submission method (GET/POST) for a specific button
    • formnovalidate: disables validation just for that button
    • autofocus: automatically focuses a field when the page loads`,
  48: `The <canvas> tag provides a space for drawing graphics with JavaScript and is used for shapes, animations, or charts.
<canvas id="myCanvas" width="200" height="100"></canvas>

<script>
  const ctx = document.getElementById("myCanvas").getContext("2d");
  ctx.fillStyle = "red";
  ctx.fillRect(10, 10, 150, 80);
</script>

** Unlike SVG, which is shape-description based, Canvas draws graphics pixel by pixel and is better suited to complex animations and games. **`,
  49: `SVG stands for Scalable Vector Graphics — an XML-based vector graphics format that can be written directly inside HTML.
<svg width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="green" />
</svg>

Advantages of SVG:
    • Scalable without quality loss, because it is based on mathematical coordinates
    • Small file size for simple shapes
    • Can be styled and animated with CSS and JavaScript
    • Ideal for icons, logos, and charts`,
  57: `The Drag and Drop API lets you drag an element and drop it somewhere else on the page with JavaScript.

Main events:
    • dragstart: when dragging the element starts
    • dragover: when the element is over the target (preventDefault must be called)
    • drop: when the element is dropped

Simple example:
<div id="item" draggable="true">I am draggable</div>

** For dragging to work, the draggable attribute must be set to true. **`,
  58: `The Web Storage API allows data to be stored in the user's browser and includes two main types:
    • localStorage: data stays permanently until the user clears it
    • sessionStorage: data only lasts until the browser tab is closed

Usage example:
localStorage.setItem("name", "KIA.");
let name = localStorage.getItem("name");

** Unlike cookies, Web Storage data is not sent to the server and stays on the client side. **`,
  59: `Web Workers make it possible to run JavaScript code on a separate background thread without blocking (freezing) the page's user interface.

Simple example:
const worker = new Worker("worker.js");
worker.postMessage("start");
worker.onmessage = function(e) {
  console.log(e.data);
};

** Web Workers are very useful for heavy, time-consuming processing such as complex calculations, but they have no direct access to the page DOM. **`,
  60: `SSE stands for Server-Sent Events — a technology that lets the server continuously and one-way push new data to the browser without the client having to poll repeatedly.

Simple example:
const source = new EventSource("stream.php");
source.onmessage = function(event) {
  console.log(event.data);
};

** Unlike WebSocket, SSE is one-way only (server to client) and suits cases like live notifications or feed updates. **`,
  50: `HTML makes it possible to embed various media (audio, video, and images) directly in the page.

The most important media tags:
    • <img>: displays an image
    • <audio>: plays an audio file
    • <video>: plays a video file
    • <source>: defines multiple formats for audio or video for better browser compatibility
    • <track>: adds subtitles to a video

** Providing multiple media formats at once (such as mp4 and webm) increases compatibility with different browsers. **`,
  51: `The <video> tag embeds and plays a video file in an HTML page.
<video width="320" height="240" controls>
  <source src="movie.mp4" type="video/mp4">
  Your browser does not support the video tag.
</video>

The most important attributes:
    • controls: shows the playback control buttons
    • autoplay: plays automatically when the page loads
    • loop: repeats the video automatically
    • muted: plays without sound
    • poster: shows an image before playback starts`,
  52: `The <audio> tag embeds and plays an audio file in an HTML page.
<audio controls>
  <source src="song.mp3" type="audio/mpeg">
  Your browser does not support the audio tag.
</audio>

The most important attributes:
    • controls: shows playback controls (play, pause, volume)
    • autoplay: plays automatically
    • loop: repeats playback
    • muted: plays without sound

** Common audio formats include mp3, wav, and ogg, whose support varies between browsers. **`,
  55: `Web APIs are a set of capabilities and programming interfaces the browser provides to JavaScript so it can interact with the browser environment and the system.

Examples of widely used Web APIs:
    • Geolocation API: gets the user's geographic location
    • Web Storage API: stores data in the browser
    • Canvas API: draws graphics
    • Fetch API: sends requests to a server
    • Drag and Drop API: implements drag-and-drop behavior

** These APIs are part of HTML5 and give developers capabilities far beyond a static page. **`,
  56: `The Geolocation API allows a website to get the user's current geographic location with their permission.
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(showPosition);
}
function showPosition(position) {
  console.log(position.coords.latitude, position.coords.longitude);
}

Important notes:
    • This feature requires the user's explicit permission
    • It is usually only available on a secure connection (HTTPS)
    • Common uses include maps, local weather, and location-based services`,
  53: `A plug-in was a helper program used in the past to display specific content such as Flash or Java applets in the browser.

Important notes:
    • Plug-ins were usually embedded in HTML with the <object> or <embed> tags
    • Today most modern browsers have completely removed support for plug-ins like Flash
    • Standard HTML5 technologies such as <video>, <audio>, and <canvas> have replaced the need for plug-ins

** This topic is mostly historical and has no use in today's projects. **`,
  54: `To display YouTube videos in an HTML page, the <iframe> tag is usually used with the embed code provided by YouTube itself.
<iframe width="560" height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  allowfullscreen>
</iframe>

Important notes:
    • The src address must be converted from a normal link to the embed form
    • The allowfullscreen attribute enables full-screen viewing
    • Playback behavior can be controlled with parameters such as autoplay or mute`,
  61: `An HTML certificate is a credential issued after completing the course and passing the related HTML exams, and it can be used in a resume or professional profile.

Important notes:
    • To earn the certificate you usually have to take an online exam with multiple-choice questions
    • The certificate usually indicates familiarity with basic to intermediate HTML concepts
    • It is best to present the certificate along with practical projects in a portfolio to demonstrate real skill.`,
  62: `This section collects practical, real-world HTML code examples so the concepts learned can be practiced in the form of real examples.

Topics usually covered:
    • A personal bio page example
    • A registration form example
    • An information table example
    • A simple image gallery example

** The best way to learn is to run these examples directly in an editor and modify them to see the result. **`,
  63: `An online HTML editor is an environment that lets you write, edit, and see the real-time output of HTML code without installing any software.

Advantages of an online editor:
    • Quickly test code snippets without setting up a full project
    • See the code and output side by side
    • Great for learning and quickly experimenting with new concepts

** Online editors are a good substitute for practice, but real projects still use tools such as VS Code. **`,
  68: `The HTML course syllabus is a complete list of the topics taught throughout the course, arranged logically from beginner to advanced.

Goals of the syllabus:
    • Providing an overview of the learning path ahead
    • Helping with planning and tracking progress
    • Ensuring full coverage of HTML concepts from basic to advanced

** Reviewing the syllabus periodically helps you know which stage of learning you are at and which topics remain.`,
  69: `An HTML study plan is a scheduled guide that helps HTML learning progress regularly, without things being forgotten.

A sample study plan:
    • Week one: fundamentals (tags, attributes, text)
    • Week two: links, images, tables, and lists
    • Week three: forms and input elements
    • Week four: semantic elements, media, and the final project

** Sticking to a regular plan, even with short daily time, gives better results than intense, irregular study. **`,
  70: `HTML interview preparation involves reviewing frequently asked technical questions that usually come up in front-end developer job interviews.

Common sample questions:
    • What is the difference between Block and Inline elements?
    • What is the difference between id and class?
    • Name the HTML5 semantic tags.
    • What is the difference between GET and POST in forms?
    • What is the purpose of the alt attribute on the img tag?

** In addition to reviewing theory, practice explaining concepts in plain language with practical examples. **`,
  71: `An HTML bootcamp is an intensive, project-based course that teaches HTML concepts practically and hands-on within a short time frame.

Characteristics of a good bootcamp:
    • Focus on real projects instead of theory alone
    • Fast feedback on the code you write
    • Full coverage of the path from beginner to job-ready

** Bootcamps suit people looking for fast, intensive learning with plenty of hands-on practice. **`,
  64: `An HTML quiz is a set of multiple-choice questions designed to measure how well HTML concepts have been learned.

Main goals of these quizzes:
    • Checking correct understanding of tags, attributes, and HTML structure
    • Identifying weak points for reviewing the material again
    • Preparing for job exams or certification tests

** It is recommended to take the related quiz after each section of the course to consolidate learning. **`,
  65: `HTML practical exercises are a set of short drills where you must complete the given code or produce a specific output.

Important notes about the exercises:
    • Each exercise usually focuses on one specific concept, such as a tag, attribute, or structure
    • Exercises consolidate the theoretical material in practice
    • It is better to try on your own first, without looking at the answer

** Learning HTML without hands-on practice is incomplete; continuous practice is the key to mastering this language. **`,
  66: `HTML code challenges are more complex than simple exercises and require combining several concepts to reach a specific output.

Characteristics of the challenges:
    • They usually involve building a complete part of a page (such as a card or a multi-part form)
    • They require thinking and combining several tags and attributes at once
    • They can be used as practice for technical interview preparation

** Solving challenges is the best way to move from beginner to intermediate level in HTML. **`,
  67: `In this section, a complete multi-page website is designed using all the concepts learned in the course.

Suggested steps for building the website:
    1. Design the overall page structure (Home, About, Contact, etc.)
    2. Create the layout using semantic tags
    3. Add real content such as text, images, and links
    4. Connect the pages to each other with internal links
    5. Do a final check of the output in the browser

** This project is an opportunity to apply all the theoretical knowledge to a real product. **`,
  72: `This section summarizes the most important concepts learned in the HTML course for a final review before moving on to CSS and JavaScript.

The most important summarized points:
    • HTML is the markup language for the structure of web pages
    • Elements consist of a tag, content, and attributes
    • Semantic elements help improve SEO and accessibility
    • Forms are the main tool for collecting user input
    • CSS and JavaScript complement HTML for the page's appearance and behavior`,
  73: `Accessibility means designing pages that are usable by all users, including people with disabilities.

The most important accessibility principles in HTML:
    • Using appropriate semantic elements instead of meaningless divs
    • Providing alt for all images
    • Correctly connecting labels to inputs in forms
    • Maintaining a logical heading order (h1 to h6)
    • Making the page usable with the keyboard alone (without a mouse)

** Accessibility is both an ethical obligation and, in many countries, a legal requirement for websites. **`,
  74: `This section provides a complete list of HTML tags with a short description of each one's use and serves as a quick reference.

A sample tag categorization:
    • Structural tags: html, head, body
    • Text tags: p, h1-h6, span
    • Media tags: img, video, audio
    • Form tags: form, input, select
    • Table tags: table, tr, td

** This list is mainly used as a reference so you don't have to memorize the use of every tag. **`,
  75: `As a reference list, this section presents all global and specific HTML attributes with a description of each one's use.

A sample attribute categorization:
    • Global attributes: id, class, style, title (usable on most tags)
    • Specific attributes: href (only for a), src (for img/media), and other element-specific attributes
    • Form attributes: required, placeholder, value, and more

** Knowing the general categories of attributes is enough; the details can always be looked up in this reference. **`,
  80: `In this supplementary section, more advanced uses of the <canvas> tag are reviewed, such as drawing complex shapes, text, gradients, and simple animation.

Sample advanced Canvas capabilities:
    • Drawing custom lines and paths with moveTo and lineTo
    • Drawing circles and arcs with arc
    • Adding text with fillText
    • Creating color gradients with createLinearGradient
    • Building animation using requestAnimationFrame

** Canvas is a powerful tool for building simple games and data visualizations on the web. **`,
  81: `In this supplementary section, more advanced points about the <audio> and <video> tags are covered, such as controlling them with JavaScript and the related events.

Sample common media events:
    • play and pause: starting and stopping playback
    • ended: the media finished playing
    • timeupdate: the playback time changed

Example of controlling with JavaScript:
let video = document.getElementById("myVideo");
video.play();
video.pause();

** By combining these events, you can build a custom player for audio and video. **`,
  82: `The doctype declaration is the first line of every HTML file and tells the browser which version of HTML the document was written in so it can render it correctly.

Sample doctype for HTML5:
<!DOCTYPE html>

Important notes:
    • A missing doctype can cause the browser to run in Quirks Mode, making page rendering unpredictable
    • In older HTML versions (such as HTML 4.01), the doctype was longer and more complicated
    • The doctype is not case-sensitive`,
  83: `In this supplementary section, a list of the most important character encodings commonly used on the web is introduced.

Sample common encodings:
    • UTF-8: today's standard, supporting most languages and symbols
    • ISO-8859-1: an older encoding for Western European languages
    • ASCII: a basic encoding containing only English letters and digits

** Using UTF-8 in all new projects is strongly recommended to prevent display problems with non-English characters. **`,
  76: `Global attributes are attributes that can be applied to almost all HTML tags.

The most important global attributes:
    • id: the element's unique identifier
    • class: grouping for styling
    • style: inline styling
    • title: tooltip text on hover
    • data-*: stores custom data related to the element for use in JavaScript
    • hidden: hides the element from display
    • tabindex: sets the keyboard focus order
    • contenteditable: makes the element's content editable by the user`,
  77: `Browser support refers to whether a specific HTML feature or tag is supported by different browsers (Chrome, Firefox, Safari, Edge).

Important notes:
    • Always check browser support before using a new feature (e.g. via caniuse.com)
    • Some older features may have been deprecated in newer browsers
    • Using a fallback or polyfill is a way to support older browsers

** Checking browser support is one of the important steps before using new technologies in real projects. **`,
  78: `Events in HTML are occurrences that can be triggered by the user or the browser and can be handled using JavaScript.

Sample common events:
    • onclick: when the element is clicked
    • onmouseover and onmouseout: when the mouse enters and leaves the element
    • onchange: when an input's value changes
    • onload: when the page or an image fully loads
    • onsubmit: when a form is submitted

Example:
<button onclick="alert('Clicked')">Click me</button>`,
    79: `In this reference section, all the common ways to define colors in HTML and CSS are reviewed.

Methods of defining a color:
    • Standard color name (140 pre-defined names like red, blue)
    • HEX: such as #FF5733 or #336699
    • RGB: such as rgb(255, 87, 51)
    • RGBA: RGB with an alpha (transparency) channel, such as rgba(255, 87, 51, 0.5)
    • HSL: Hue, Saturation, Lightness, such as hsl(14, 100%, 56%)
    • HSLA: HSL with an alpha channel, such as hsla(14, 100%, 56%, 0.5)

** HEX codes are the most common; RGB/RGBA and HSL/HSLA add the transparency option. **`,
  84: `In this supplementary section, a reference table of common URL encoding codes is introduced; these codes are used when sending data in addresses.

Sample frequently used codes:
    • space → %20
    • ! → %21
    • # → %23
    • & → %26
    • / → %2F
    • ? → %3F

** These codes are usually generated automatically by the browser or by programming functions such as encodeURIComponent in JavaScript. **`,
  85: `Language codes (Lang Codes) are used in the lang attribute of the <html> tag to specify the main language of the page content.
<html lang="fa">

Sample common codes:
    • fa: Persian
    • en: English
    • ar: Arabic
    • fr: French

Benefits of setting lang correctly:
    • Helps search engines identify the content language
    • Improves screen reader performance for blind users
    • Correctly enables the browser's automatic translation`,
  86: `HTTP messages are the information exchanged between the browser (client) and the server and include two main types:
    • Request: the request the browser sends to the server
    • Response: the response the server returns to the browser

Main parts of every HTTP message:
    • Start Line: contains the method or status code
    • Headers: extra information such as content type or cookies
    • Body: the main body of the message (if any)

** Understanding the structure of HTTP messages is essential for understanding how forms and Fetch/AJAX requests communicate with the server. **`,
  87: `HTTP methods specify the type of operation the browser requests from the server.

The most important methods:
    • GET: retrieves information from the server (the most common method, like opening a page)
    • POST: sends new information to the server (such as submitting a form)
    • PUT: fully updates an existing resource
    • DELETE: deletes a resource
    • PATCH: partially updates a resource

** HTML forms usually only support GET and POST, but in modern web development (such as APIs) all methods are used. **`,
  88: `The PX to EM Converter helps developers convert fixed pixel values into the relative em unit, which is more suitable for responsive design.

Important notes:
    • em is calculated relative to the parent element's font size
    • Conversion formula: em value = px value ÷ base font size (usually 16px)
    • Example: 24px with a 16px base font equals 1.5em

** Using em or rem instead of px makes the design more flexible with respect to the user's font settings and different screen sizes. **`,
  89: `Knowing keyboard shortcuts in code editors such as VS Code dramatically increases speed and productivity when writing HTML code.

Sample frequently used shortcuts:
    • ! + Tab (Emmet): automatically generates the basic HTML5 skeleton
    • Ctrl + / : quickly comment out the selected line
    • Ctrl + D: multi-select similar words
    • Alt + Shift + F: auto-format the code
    • Ctrl + S: save the file

** Mastering keyboard shortcuts is one of the main differences between a beginner and a professional developer in coding speed. **`,
  90: `CSS stands for Cascading Style Sheets and is the language for designing and styling HTML elements. If HTML is the skeleton of a web page, CSS creates its face and appearance.

What does CSS do?
    • Sets the color, font, and text size
    • Adjusts spacing, margins, and element layout
    • Builds responsive layouts for different devices
    • Adds visual effects such as shadows, gradients, transitions, and animation

** Learning CSS complements HTML; without CSS, web pages would be plain text with no proper appearance. **`,
  91: `In this section we cover how to get started with CSS. CSS attaches to HTML in three main ways:
    1. Inline: writing styles directly in a tag's style attribute
    2. Internal: writing styles inside a <style> tag in the document head
    3. External: writing styles in a separate .css file and linking it with <link>

Example of linking an external file:
<link rel="stylesheet" href="style.css">

** The external method is recommended for real projects because it separates content from presentation and improves maintainability. **`,
    92: `The syntax (structure) for writing CSS consists of a selector together with a declaration block.

General structure:
selector {
  property: value;
}

Example:
p {
  color: red;
  text-align: center;
}

The individual parts:
    • Selector: selects the HTML element(s) to style (like p or .my-class)
    • Declaration Block: enclosed in braces, contains one or more declarations
    • Property: the style attribute to set (like color, margin, font-size)
    • Value: the value assigned to the property (like red, 10px, bold)
    • Each declaration is separated by a semicolon and ends optionally with one`,
  93: `Selectors in CSS specify which HTML element(s) should receive the styles.

The most important types of selectors:
    • Element Selector: selects based on the tag name (like p or h1)
    • Class Selector: selects elements with a specific class (written as .my-class)
    • ID Selector: selects the element with a specific id (written as #my-id)
    • Universal Selector: selects all elements (written as *)
    • Attribute Selector: selects elements with a specific attribute (like input[type='text'])
    • Pseudo-class: selects based on state (like :hover, :active, :focus)
    • Pseudo-element: selects and styles parts of an element (like ::before, ::after)

Example:
.highlight { background: yellow; }  /* class selector */
#header { font-size: 20px; }        /* id selector */
p:hover { color: red; }             /* pseudo-class */`,
  94: `In this section, practical ways to add CSS to a real project are reviewed along with best practices for organizing style files.

Practical tips:
    • For small projects, a single style.css file alongside index.html is sufficient
    • For larger projects, split CSS into several related files (like header.css, footer.css)
    • Always use external CSS (separate files) instead of inline styles for better maintenance
    • Group related styles together and add comments for readability
    • Use meaningful class names following a naming convention (like BEM)

** Keeping styles in separate files makes the code cleaner, easier to debug, and more reusable. **`,
  95: `A comment in CSS is used to explain different parts of the code or to temporarily disable a style block; it has no effect on the final page output.

How to write a comment:
/* This is a comment */

Example:
p {
  color: red; /* red text color */
}

** Unlike HTML, a CSS comment always starts with /* and ends with */, and multi-line comments are also possible. **`,
  96: `Common CSS errors usually stem from small syntax mistakes that can prevent the intended styles from being applied.

The most common errors:
    • Forgetting the semicolon (;) at the end of each declaration
    • Forgetting the closing brace }
    • Typos in property or selector names
    • Incorrect use of measurement units

** Many code editors, such as VS Code, automatically highlight CSS syntax errors, which greatly helps in quickly fixing bugs. **`,
  97: `Colors in CSS can be defined in several ways, and the right color system depends on the project.

Ways to define colors:
    • Standard color names: such as red, blue
    • HEX: such as #ff5733
    • RGB and RGBA: such as rgb(255, 87, 51), and rgba(255, 87, 51, 0.5) for transparency
    • HSL and HSLA: such as hsl(9, 100%, 60%)

** HSL is much better than HEX for easily adjusting a color's lightness and saturation (e.g. building different shades of one color). **`,
  98: `The background property in CSS is used to set the backgrounds of elements and includes several related sub-properties.

The most important background properties:
    • background-color: sets the background color
    • background-image: sets a background image with url()
    • background-repeat: sets image tiling (repeat, no-repeat)
    • background-position: sets the image position
    • background-size: sets the image size (such as cover or contain)

Example:
div {
  background: url("bg.jpg") no-repeat center/cover;
}`,
  99: `The border property in CSS defines a border around an element and consists of three main parts: width, line style, and color.

Example:
div {
  border: 2px solid black;
}

The most important border-style values:
    • solid: a continuous line
    • dashed: a dashed line
    • dotted: a dotted line
    • double: a double line

You can also use border-radius to round the element's corners:
div { border-radius: 10px; }`,
  100: `The margin property sets the space between an element and the elements around it (outside the border).

Ways to define margin:
    • All four sides with one value: margin: 20px;
    • Vertical and horizontal: margin: 10px 20px;
    • Each side separately: margin-top, margin-right, margin-bottom, margin-left

** margin: auto; is commonly used to horizontally center a block element with a fixed width. Negative margins are also possible. **`,
  101: `The padding property sets the inner space between an element's content and its border.

Ways to define padding:
    • All four sides with one value: padding: 20px;
    • Vertical and horizontal: padding: 10px 20px;
    • Each side separately: padding-top, padding-right, padding-bottom, padding-left

** Unlike margin, padding cannot be negative and is always considered part of the element's visible inner space. **`,
  102: `The width and height properties set an element's width and height respectively and can be defined with various units such as px, %, or vw/vh.

Example:
div {
  width: 300px;
  height: 150px;
}

Complementary properties:
    • max-width and max-height: set the maximum allowed size
    • min-width and min-height: set the minimum allowed size

** Using percentages (%) instead of fixed pixels makes an element more flexible and responsive relative to its parent. **`,
  103: `The box model describes how the space occupied by each HTML element is calculated and consists of four layers:
    1. Content: the element's main content
    2. Padding: the inner space around the content
    3. Border: the border around the padding
    4. Margin: the outer space between the element and adjacent elements

** With box-sizing: border-box, the defined width and height also include padding and border, which makes calculating element sizes much simpler. This value is set by default in most projects today. **`,
  104: `The outline property draws a line outside an element's border and, unlike border, does not affect the element's size calculation (Box Model).

Example:
input:focus {
  outline: 2px solid blue;
}

Important notes:
    • outline is usually used to show the focus state of interactive elements (such as input)
    • Completely removing the outline without a suitable replacement harms accessibility for keyboard users`,
  105: `CSS text properties are used to control the appearance and layout of text.

The most important properties:
    • color: the text color
    • text-align: the horizontal text alignment (left, right, center, justify)
    • text-decoration: adds or removes under/over lines (underline, line-through, none)
    • text-transform: changes the letter case (uppercase, lowercase, capitalize)
    • letter-spacing and word-spacing: set the spacing between letters and words
    • line-height: sets the line height for better readability`,
  106: `Font properties in CSS are used to control the typography of text.

The most important properties:
    • font-family: sets the font (with a fallback list to ensure support)
    • font-size: sets the font size
    • font-weight: sets the font thickness (normal, bold, or numeric values like 400, 700)
    • font-style: sets the font style (normal, italic)

Example:
p {
  font-family: "Segoe UI", Tahoma, sans-serif;
  font-size: 16px;
}`,
  107: `Icons in CSS are usually added to the project via ready-made libraries such as Font Awesome or Google Material Icons.

How to use them:
    1. Attach the icon library's CSS file in the head
    2. Use an <i> or <span> tag with the class of the desired icon

Example:
<i class="fa fa-home"></i>

** Icon fonts can have their color and size changed through CSS, just like ordinary text. A more modern alternative is SVG Icons. **`,
  108: `Styling links in CSS with pseudo-classes makes it possible to define different behavior in different states.

The most important link pseudo-classes:
    • a:link: the default, unvisited link state
    • a:visited: the visited link state
    • a:hover: when the mouse hovers over the link
    • a:active: the moment the link is clicked

** The order of these pseudo-classes matters; they are usually written in LVHA order (Link, Visited, Hover, Active) so the styles apply correctly. **`,
  109: `Styling lists in CSS makes it possible to control the appearance of ordered and unordered list items.

The most important properties:
    • list-style-type: sets the marker type (disc, circle, square, decimal, none)
    • list-style-image: uses a custom image instead of the default bullet
    • list-style-position: sets the marker position relative to the text (inside or outside)

Example:
ul {
  list-style-type: square;
}`,
  110: `Styling tables in CSS improves the appearance and readability of HTML tables.

The most common properties:
    • border-collapse: merges the double lines between cells into a single line
    • width: sets the table or cell widths
    • text-align: aligns the content inside cells
    • padding: adds inner space to cells for better readability
    • :nth-child(even): alternating row coloring (Zebra Striping)

Example:
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #ddd; padding: 8px; }`,
  111: `The display property determines how an HTML element is displayed on the page and is one of the most important CSS properties for controlling layout.

The most important display values:
    • block: takes up the full available width and starts on a new line
    • inline: only takes up as much space as its content and continues on the same line
    • inline-block: a combination of both; stays on the current line but width/height can be set
    • none: completely hides the element from the page (taking up no space)
    • flex and grid: enable the modern Flexbox and Grid layout systems`,
  112: `The max-width property sets the maximum allowed width of an element and plays an important role in responsive design.

Example:
.container {
  max-width: 1200px;
  margin: 0 auto;
}

Advantages of max-width over a fixed width:
    • The element does not grow beyond a certain limit on large screens
    • On small screens (mobile), the element automatically shrinks and still fits the page

** Combining max-width with margin: auto is one of the most common ways to center the page's main container. **`,
  113: `The position property determines how an element is placed relative to the normal page flow or other elements.

The most important position values:
    • static: the default; no special positioning
    • relative: the element is moved relative to its own original position
    • absolute: the element is positioned relative to the nearest ancestor with a position other than static
    • fixed: the element stays fixed relative to the viewport even when scrolling
    • sticky: a mix of relative and fixed that becomes fixed at a specific scroll point`,
  114: `After setting position to a value other than static, the top, right, bottom, and left properties are used to precisely move the element (Position Offsets).

Example:
.box {
  position: absolute;
  top: 20px;
  left: 50px;
}

Important notes:
    • With position: relative, the movement happens relative to the element's own original position
    • With position: absolute or fixed, the movement happens relative to the established reference (parent or viewport)`,
  115: `The z-index property determines the stacking order of elements along the depth axis (which layers appear on top of others) when there is visual overlap. It only takes effect on elements with a position value other than static.

Example:
.box1 { position: absolute; z-index: 1; }
.box2 { position: absolute; z-index: 2; }

Important notes:
    • Only positioned elements (non-static) can have a z-index
    • z-index values are relative — 1000 is not necessarily 1000 times more important than 1
    • The default z-index for all elements is auto (0)
    • Child elements are constrained by their parent's stacking context`,
  116: `The overflow property controls what happens to content that is larger than its container.

The most important overflow values:
    • visible: the default; overflow content is shown outside the container
    • hidden: overflow content is clipped and not visible
    • scroll: adds scrollbars so the user can scroll to see the overflow content
    • auto: adds scrollbars only when the content actually overflows
    • overflow-x and overflow-y: control horizontal and vertical overflow separately

Example:
.box { width: 200px; height: 100px; overflow: scroll; }
** The overflow property is commonly combined with position or flexbox/grid to create scrollable areas. **`,
  117: `The float property was historically one of the main page layout methods; it moves the element to the left or right of its container and makes subsequent elements wrap around it.

Example:
img {
  float: left;
  margin-right: 10px;
}

Example:
img {
  float: left;
  margin-right: 10px;
}

Important notes:
    • Using float requires clearing subsequent elements to prevent a broken layout
    • Today, Flexbox and Grid are a better, more modern replacement for float in page layout
    • float is still useful for cases such as wrapping text around an image`,
  118: `The inline-block value of the display property is a mix of inline and block behavior; the element stays on the same line but its width and height can also be set.

Example:
.item {
  display: inline-block;
  width: 100px;
  height: 50px;
}

** Before Flexbox became widespread, this property was one of the common ways to place several elements side by side with full control over their size. **`,
  119: `Aligning elements in CSS can be done by combining several different methods, depending on the element type (text, block, or flex).

Common alignment methods:
    • text-align: horizontal alignment of text content inside an element
    • margin: auto: horizontal centering of a block element with a fixed width
    • position + transform: precise alignment by combining top/left with translate
    • Flexbox (justify-content and align-items): the simplest and most modern way to align horizontally and vertically at once

** For most modern alignment needs, Flexbox is recommended since it is far more readable and flexible than older methods. **`,
  120: `Combinators in CSS specify the relationship between several selectors and allow more precise element selection.

The most important combinators:
    • Descendant (space): div p → all p elements inside div (at any depth)
    • Child (>): div > p → only p elements that are direct children of div
    • Adjacent Sibling (+): h1 + p → the first p immediately after h1
    • General Sibling (~): h1 ~ p → all p elements after h1 at the same level

** Using combinators correctly leads to writing precise CSS`,
  121: `Pseudo-classes select a specific state of an element without needing to add an extra class in HTML.

The most important common pseudo-classes:
    • :hover: when the mouse hovers over
    • :focus: when an element (such as input) is focused
    • :first-child and :last-child: select the first or last child
    • :nth-child(n): select a child by number or pattern
    • :not(selector): select all elements except the specified ones

Example:
li:nth-child(odd) { background: #eee; }`,
  122: `Pseudo-elements select a specific part of an element or add content to it, without needing an extra tag in HTML.

The most important pseudo-elements:
    • ::before: adds content before the element
    • ::after: adds content after the element
    • ::first-letter: selects the first letter of the text
    • ::first-line: selects the first line of the text
    • ::selection: styles the text selected by the user

Example:
p::before {
  content: "★ ";
}

** To use ::before and ::after, the content property is required, even if its value is empty. **`,
  123: `The opacity property sets the transparency of an element and accepts a value between 0 (fully transparent) and 1 (fully opaque).

Example:
.box {
  opacity: 0.5;
}

Important note:
    • Unlike rgba, which only makes the color transparent, opacity makes the whole element transparent, including its inner content (text, image, and children)
    • To make only the background transparent without affecting the content, it is better to use background-color: rgba()`,
  124: `The navigation bar is an important part of any website and is usually built by combining the <nav> tag, a <ul>/<li> list, and CSS styling.

A common way to build a navigation bar:
nav ul {
  list-style: none;
  display: flex;
}
nav a {
  text-decoration: none;
  padding: 10px 15px;
}

Important notes:
    • Use display: flex to lay out the menu items horizontally
    • Add a :hover state to improve the user experience
    • On mobile, a hamburger menu with JavaScript is usually needed`,
  125: `A dropdown menu is built by combining position: relative on the parent and position: absolute on the submenu, together with conditional display via :hover or JavaScript.

Simple example:
.dropdown { position: relative; }
.dropdown-content {
  display: none;
  position: absolute;
}
.dropdown:hover .dropdown-content {
  display: block;
}

** This pattern is the foundation of many multi-level menus on real websites. **`,
  126: `An image gallery is built by combining Flexbox or CSS Grid to arrange several images side by side in a responsive way.

Simple example with Grid:
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

Important notes:
    • Use object-fit: cover to prevent images from being stretched out of proportion
    • Add a transition on hover for a better visual effect`,
  127: `Image sprites is a technique where several small images are combined into a single file and the desired part is displayed using background-position.

Main advantage:
    • Reduces the number of HTTP requests to the server and speeds up page loading

Example:
.icon-home {
  background: url("sprite.png") -10px -20px;
  width: 20px;
  height: 20px;
}

** Today, with the progress of technologies like HTTP/2 and the widespread use of SVG and icon fonts, sprite usage has declined, but it is still used in some projects. **`,
  128: `Attribute selectors make it possible to select elements based on the presence or value of a specific attribute.

The most important patterns:
    • [target]: selects elements that have a target attribute
    • [type="text"]: selects elements with an exact specified value
    • [href^="https"]: selects elements whose attribute value starts with the specified text
    • [href$=".pdf"]: selects elements whose attribute value ends with the specified text
    • [class*="btn"]: selects elements whose attribute value contains the specified text

Example:
input[type="password"] { border: 1px solid red; }`,
  129: `Styling forms with CSS improves the appearance and the user experience when filling out forms.

The most important form styling points:
    • Use box-sizing: border-box for accurate input sizing
    • Add proper padding for comfortable clicking and typing
    • Style the :focus state to clearly show the active field
    • Align labels and inputs correctly with Flexbox or Grid

Example:
input:focus {
  border-color: #4CAF50;
  outline: none;
}`,
  130: `CSS counters make it possible to number elements automatically without JavaScript.

Example:
body {
  counter-reset: section;
}
h2::before {
  counter-increment: section;
  content: "Section " counter(section) ": ";
}

Main parts:
    • counter-reset: initializes the counter
    • counter-increment: increases the counter value
    • counter(): displays the current counter value in content

** This feature is very useful for automatically numbering chapters, sections, or list items. **`,
  131: `CSS provides various measurement units for defining values, divided into two broad categories: absolute and relative.

Absolute units:
    • px: pixel, the most common absolute unit

Relative units:
    • %: relative to the parent element
    • em: relative to the parent element's font size
    • rem: relative to the root element's (html) font size
    • vw and vh: relative to the viewport's width and height

** Using relative units such as rem and % is highly recommended for responsive, flexible design. **`,
  132: `Inheritance in CSS means that some properties are automatically passed from a parent element to its children, unless explicitly overridden.

Properties that are usually inherited:
    • color, font-family, font-size, line-height

Properties that are usually not inherited:
    • margin, padding, border, width, height

** With the inherit value, you can manually make a non-inherited property inherit from the parent: div { border: inherit; } **`,
  133: `Specificity is the rule that determines which style is finally applied when multiple styles conflict on one element.

Priority order from lowest to highest:
    1. Element selector (such as p) — lowest priority
    2. Class, attribute, and pseudo-class selectors (such as .intro, :hover)
    3. ID selector (such as #main)
    4. Inline style (written in the style attribute)
    5. !important — highest priority

** When specificity is equal, the rule written lower in the code (cascading) is applied. **`,
  134: `The !important rule in CSS is used to force a style to apply, regardless of its specificity.

Example:
p {
  color: red !important;
}

Important notes:
    • !important has the highest priority in style conflicts
    • Overusing this rule makes the CSS code complicated and unmanageable
    • It is recommended to use !important only when truly necessary and exceptional, not as the primary way to manage specificity`,
  135: `CSS math functions make it possible to perform calculations directly inside CSS values.

The most important functions:
    • calc(): performs combined calculations with different units
      width: calc(100% - 50px);
    • min(): picks the smallest value among several values
    • max(): picks the largest value among several values
    • clamp(): sets a value between a defined minimum and maximum, ideal for responsive design
      font-size: clamp(1rem, 2vw, 2rem);`,
  136: `CSS optimization means writing style code with high performance, smaller size, and better maintainability.

The most important optimization techniques:
    • Removing duplicate code and reusing shared classes
    • Using shorthand properties (such as margin instead of four separate lines)
    • Minifying the CSS file for production
    • Avoiding overly nested and complex selectors
    • Removing unused CSS rules`,
  137: `Accessibility in CSS means designing styles that provide a good user experience for all users, including low-vision or keyboard users.

The most important points:
    • Maintaining sufficient color contrast between text and background
    • Not completely removing the outline on :focus without a suitable replacement
    • Avoiding intense animations that can bother some users (respecting prefers-reduced-motion)
    • Ensuring text remains readable at different screen sizes`,
  138: `Website layout design is done by combining semantic HTML elements with CSS tools such as Flexbox and Grid.

The common structure of a layout:
    • Header: the top section containing the logo and menu
    • Navigation: the site's main menu
    • Main Content: the page's main content, sometimes with a sidebar
    • Footer: the bottom section with contact info or copyright

** Using CSS Grid for the overall page layout and Flexbox for the inner components of each section is a common and effective combination. **`,
  139: `The border-radius property is used to round an element's corners and is one of the most common visual effects in modern design.

Example:
.box {
  border-radius: 10px;
}

Important notes:
    • You can define a separate value for each corner: border-radius: 10px 0 10px 0;
    • With a value of 50%, a square element can be turned into a perfect circle

** border-radius is one of the simplest ways to make buttons and cards look softer and more modern. **`,
  140: `The border-image property allows an image to be used instead of a plain color for an element's border.

Example:
.box {
  border: 10px solid;
  border-image: url("border.png") 30 round;
}

Main parts:
    • border-image-source: the image path
    • border-image-slice:how the image is cut to fit corners and edges
    • border-image-repeat:how the image repeats (stretch, repeat, round)

** This feature is used for decorative and special designs, although less common than a simple border. **`,
  141: `In this supplementary section, more advanced background uses are covered, such as using multiple background layers at once.

Example of multiple layers:
.box {
  background: url("pattern.png"), linear-gradient(to right, red, blue);
}

Important notes:
    • Multiple background images can be separated with commas and stacked on top of each other
    • Layer order matters; the first item sits in the topmost layer
    • background-attachment: fixed can create a simple parallax effect`,
  142: `In this supplementary section, CSS color systems are reviewed from the perspective of practical use in real projects and color combinations.

Practical notes:
    • Use a limited color palette (usually 3 to  5 main colors) for visual consistency
    • Define the project's main colors with CSS Variables for easier management
    • Use tools like the color wheel to pick harmonious combinations

** Smart color choices have a direct effect on the user experience and the visual brand of a website. **`,
  143: `Gradients in CSS allow smooth transitions between two or more colors and are created with the linear-gradient, radial-gradient, or conic-gradient functions.

Example:
.box {
  background: linear-gradient(to right, red, yellow);
}

Main types:
    • linear-gradient: changes colors along a straight line
    • radial-gradient: changes colors outward from a center point
    • conic-gradient: changes colors around a center point, like a color wheel

** Gradients can be used anywhere an image is expected, such as backgrounds or border images. **`,
  144: `Shadows in CSS are created with box-shadow (for elements) and text-shadow (for text) and are used to add depth and visual interest to the design.

Example:
.box {
  box-shadow:  5px 5px 10px rgba(0, 0, 0, 0.3);
}

Important notes:
    • box-shadow properties: offse-x, offse-y, blur, spread, color
    • text-shadow follows a similar pattern for text
    • Multiple shadows can be combined by separating them with commas

** Shadows should be used sparingly for a clean, modern design. **`,
  145: `Text effects in CSS let you control how text wraps, overflows, and appears, including text-overflow, word-wrap, and writing-mode.

The most common text effects:
    • text-overflow: ellipsis; — show "..." when the text overflows its container
    • word-wrap: break-word; — break long words to fit the container
    • text-shadow: — add a shadow to the text
    • writing-mode: — set the direction of the text (horizontal or vertical)

** Using these effects carefully improves readability and layout stability. **`,
  146: `Custom fonts in CSS are loaded with @font-face or external font services such as Google Fonts, letting you use fonts beyond the default system set.

Using Google Fonts:
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap">

Example @font-face:
@font-face {
  font-family: "MyFont";
  src: url("myfont.woff2") format("woff2");
}

** Load only the font weights you need to keep pages fast. **`,
  147: `2D transforms in CSS allow moving, rotating, resizing, and skewing elements in a two-dimensional space.

The most important transform functions:
    • translate(x,y): moves the element
    • rotate(deg): rotates the element
    • scale(x,y): changes the element size
    • skew(x,y): skews the element

Example:
.box {
  transform: rotate(45deg) scale(1.2);
}

** Combining transform with transition creates attractive interactive effects on hover. **`,
  148: `3D transforms in CSS allow rotating and moving elements in a three-dimensional space (along the Z axis).

The most important functions:
    • rotateX(), rotateY(), rotateZ(): rotation around different axes
    • translateZ(): movement in depth of the page
    • perspective: sets the depth of the 3D view

Example:
.card {
  transform: rotateY(180deg);
  transform-style: preserve-3d;
}

** These features are usually used for effects such as rotating (flip) cards. **`,
  149: `The transition property creates a smooth, gradual change between two states of a CSS property, without needing to define separate steps.

Example:
.box {
  transition: background-color 0.3s ease;
}
.box:hover {
  background-color: blue;
}

Main parts of a transition:
    • Property:the property to animate
    • Duration:the transition duration
    • Timing function:the acceleration pattern (ease, linear, ease-in-out)
    • Delay:delays the transition start (optional)`,
  150: `CSS animations, unlike transitions which only run between two states, allow defining multiple sequential steps of motion using @keyframes.

Example:
@keyframes slide {
  from { left: 0; }
  to { left:  100px; }
}
.box {
  animation: slide 2s infinite;
}

The most important animation properties:
    • animation-duration:the duration of the animation
    • animation-iteration-count:the number of repetitions (or infinite)
    • animation-direction:the playback direction (normal, reverse, alternate)`,
  151: `A tooltip is text that appears when hovering over an element and is usually built with position: relative on the parent anda hidden span or ::after element.

Simple example:
.tooltip {
  position: relative;
}
.tooltip .tooltip-text {
  visibility: hidden;
  position: absolute;
}
.tooltip:hover .tooltip-text {
  visibility: visible;
}

** Unlike the title attribute, which has a plain, non-styleable browser look, a custom tooltip gives you full control over the design. **`,
  152: `Styling images involves a set of CSS techniques to improve the appearance of images on the page.

Common techniques:
    • border-radius: rounds the image corners
    • box-shadow: adds a shadow to the image
    • filter: adds visual effects such as grayscale or blur
    • transition + transform: smoothly zooms the image on hover

Example:
img:hover {
  transform: scale(1.1);
  transition: transform 0.3s;
}`,
  153: `An image modal is a lightbox-style popup that displays a larger version of an image when clicked, usually built with CSS positioning, JavaScript, anda hidden overlay that becomes visible on click.,

A typical structure:
.modal { display: none; position: fixed; ... }
.modal.active { display: block; }

** Modals must be closable (via a close button, clicking the backdrop, or pressing Escape) for good usability. **`,
  154: `Centering images (and other elements) can be done in several ways depending on the context:

Common methods:
    • text-align: center on the parent for inline images
    • margin: 0 auto for a block image with a fixed width
    • Flexbox: justify-content: center and align-items: center on the parent
    • position + transform for precise centering

** Flexbox is the simplest, most reliable modern way to center an image both horizontally and vertically. **`,
  155: `Image filters with the filter property let you apply visual effects directly to an image without image-editing software.

The most important filter values:
    • grayscale(): converts to black and white
    • blur(): blurs the image
    • brightness() and contrast(): adjusts brightness and contrast
    • sepia(): adds an old-fashioned (sepia) effect

Example:
img {
  filter: grayscale(100%);
}
img:hover {
  filter: none;
}`,
  156: `Image shapes, by combining border-radius or the more advanced clip-path property, allow images to be displayed in non-rectangular shapes.

Simple circle example:
img {
  border-radius:  50%;
}

Polygon example with clip-path:
img {
  clip-path: polygon(50% 0%,  0% 100%,  100% 100%);
}

** clip-path is far more flexible than border-radius and allows building arbitrary complex shapes. **`,
  157: `The object-fit property controls how an image or video is sized inside its defined container (width/height), without breaking the image aspect ratio.

The most important values:
    • fill:stretches the image to fill the container (may break the aspect ratio)
    • cover:fills the container completely while preserving the aspect ratio (cropping overflow)
    • contain:shows the whole image while preserving aspect ratio (no cropping)
    • none:shows the image's original size

Example:
img {
  width:300px; height:200px;
  object-fit:cover;
}`,
  158: `The object-position property sets the position of an image or video inside its container, and is usually used together with object-fit: cover to choose which part of the image stays visible.

Example:
img {
  object-fit: cover;
  object-position: top;
}

Common values:
    • top, bottom, left, right, center
    • or precise percentage values: object-position:30% 70%;

** This property is commonly used to control cropped images more precisely in galleries or product cards. **`,
  159: `CSS masking lets you hide part of an element based on the shape or transparency of another image (the mask.

Simple example:
.box {
  -webkit-mask-image: url("mask.svg");
  mask-image: url("mask.svg");
}

Common uses:
    • Creating fade effects at the edges of an element
    • Displaying an image in complex, custom shapes

** Full support in some browsers may require the -webkit- prefix. **`,
  160: `Button design with CSS combines visual and interactive properties to create a good user experience.

The most common button properties:
    • padding and border-radius: proper inner space and soft corners
    • background-color and color: set the background and text colors
    • cursor: pointer: changes the mouse pointer on hover
    • transition: creates soft color or shadow changes on hover
    • :active: changes the button appearance at the click moment`,
  161: `Pagination, usually used for long lists, is built with a series of links or buttons and styled so the current page is clearly highlighted.

Common styles:
.page-link { padding: 8px 16px; border: 1px solid #ddd; }
.page-link.active { background-color: #4CAF50; color: white; }

** Good pagination shows the current page, previous/next arrows, and enough page numbers to navigate without too many clicks. **`,
  162: `The multiple-columns layout lets text flow into several side-by-side columns, similar to a newspaper, using the column-count or column-width properties.

Example:
.article {
  column-count:  3;
  column-gap:  40px;
}

** This layout suits long text content and improves readability by keeping lines short. **`,
  163: `User interface (UI) properties in CSS style interactive elements such as inputs, selection, resizing, and cursors to improve usability.

Common UI properties:
    • cursor: sets the cursor style over an element
    • resize: lets the user resize an element (e.g. textarea)
    • outline:none: removes the default focus border (use with caution for accessibility»
    • user-select:none: prevents text selection
    • appearance:none: resets native browser styling of form controls

** Always preserve a visible focus state for keyboard accessibility when customizing UI. **`,
  164: `CSS variables (also called custom properties) let you define reusable values across an entire CSS file, making project management much simpler.

Example:
:root {
  --main-color: #3498db;
}
h1 {
  color: var(--main-color);
}

Advantages:
    • Changing one value updates it everywhere automatically
    • Values can be changed dynamically with JavaScript
    • Improves readability and consistency of colors, spacing, and sizes in the project`,
  165: `The @property rule lets developers define a custom CSS variable with a specified type, default value, and inheritance behavior, and also enables animating CSS variables.

Example:
@property --my-color {
  syntax: "<color>";
  inherits: false;
  initial-value: #3498db;
}

** This feature is relatively new and, unlike simple CSS variables, lets the browser animate smoothly between two values (e.g., two colors). **`,
  166: `The box-sizing property determines how an element's final width and height are calculated in the box model.

The most important values:
    • content-box:the default; width/height only include content, and padding/border are added on top
    • border-box:width/height also include padding and border

Common reset used in projects:
* {
  box-sizing: border-box;
}

** Using border-box makes element size calculations much simpler and more predictable. **`,
  167: `Media queries are the primary CSS tool for implementing responsive design, letting different styles be applied based on screen characteristics (such as width.

Example:
@media (max-width: 768px) {
  body {
    font-size: 14px;
  }
}

The most important queryable features:
    • width and height: the viewport width and height
    • orientation: landscape or portrait
    • prefers-color-scheme: detects the user's dark or light system theme`,
  168: `Flexbox is a one-dimensional CSS layout system that makes arranging elements in a row or a column, with easy control over spacing and alignment, very simple.

Activating Flexbox:
.container {
  display: flex;
}

Main advantages of Flexbox:
    • Automatic space distribution between items
    • Easy horizontal and vertical alignment at once
    • Changing the display order of elements without changing HTML

** Flexbox is better suited to laying out the inner components of a section (such as a menu or card) than to the overall page layout. **`,
  169: `The flex container is the element with display: flex applied, responsible for controlling the layout of its children (flex items.

The most important flex container properties:
    • flex-direction: sets the layout direction (row, column, row-reverse, column-reverse)
    • justify-content: aligns items along the main axis
    • align-items: aligns items along the cross axis
    • flex-wrap: allows items to wrap to multiple lines when space is low
    • gap: sets the spacing between items`,
  170: `Flex items are the direct children of a flex container and have special properties to control each item's individual behavior.

The most important flex item properties:
    • flex-grow:how much an item grows to fill extra space
    • flex-shrink:how much an item shrinks when space is low
    • flex-basis:the item's base size before extra space is distributed
    • flex:ashorthand for grow, shrink,and basis
    • align-self:overrides align-items for a single item`,
  171: `By combining Flexbox and Media Queries, responsive (flex) layouts can be built that automatically adapt to the screen size.

Example:
.container {
  display: flex;
  flex-wrap: wrap;
}
@media (max-width: 600px) {
  .container {
    flex-direction: column;
  }
}

** flex-wrap: wrap along with flex-basis on the items is one of the most common ways to build a simple responsive grid without CSS Grid. **`,
  172: `CSS Grid is a two-dimensional layout system that allows simultaneous control of rows and columns and is very powerful for designing overall page layouts.

Activating Grid:
.container {
  display: grid;
}

Main difference between Grid and Flexbox:
    • Flexbox: one-dimensional layout (only a row or only a column)
    • Grid: two-dimensional layout(rows and columns at once)

** The choice between Grid and Flexbox depends on the need; Grid is usually used for the overall page layout and Flexbox for laying out inner components. **`,
  173: `The grid container is the element with display: grid applied, and its properties control the rows, columns, gaps, and areas of the grid.

The most important grid container properties:
    • grid-template-columns: defines the column tracks
    • grid-template-rows: defines the row tracks
    • gap (column-gap, row-gap): sets the spacing between tracks
    • grid-template-areas: names layout areas for easier placement
    • justify-items and align-items: align items inside their cells`,
  174: `Grid items are the direct children of a grid container; each item can be placed explicitly on the grid using line numbers or area names,

The most important grid item properties:
    • grid-column: grid-column-start / grid-column-end shorthand
    • grid-row: grid-row-start / grid-row-end shorthand
    • grid-area: places the item using a named area or line numbers
    • justify-self and align-self: override the container alignment for a single item

** Explicit placement gives full control over where each item sits in the layout. **`,
  175: `The 12-column grid layout is one of the most common structures in web design, dividing the page width into twelve equal columns so elements can be sized as fractions of the width (e.g. 3/12 = 25%).

Example with CSS Grid:
.grid { display: grid; grid-template-columns: repeat(12, 1fr); }
.col-3 { grid-column: span 3; }
.col-9 { grid-column: span 9; }

** This pattern is the basis of responsive frameworks such as Bootstrap, and building a simple version with CSS Grid is a great exercise. **`,
  176: `The @supports rule lets you apply CSS styles only when the browser supports a specific feature, enabling progressive enhancement and graceful fallbacks.

Example:
@supports (display: grid) {
  .container { display: grid; }
}

** Check support before loading heavy fallback code; @supports keeps your CSS resilient on older browsers. **`,
  177: `Responsive Web Design (RWD) is the approach of building pages that adapt their layout and content to every screen size, from mobile phones to desktop monitors.

Core principles:
    • Fluid grids that use relative units (% instead of px)
    • Flexible images and media
    • Media queries to apply different styles per breakpoint
    • Mobile-first or desktop-first strategy

** Design for the smallest screen first (mobile-first) whenever possible — it keeps layouts simple and fast. **`,
  178: `The viewport meta tag tells the browser how to scale the page on mobile devices. Without it, mobile browsers render pages at desktop width and then zoom out.

Setting the viewport:
<meta name="viewport" content="width=device-width, initial-scale=1.0">

** Always include the viewport meta tag in the <head> for any responsive site. **`,
  179: `A grid view splits the page into a set of columns (commonly 12) and lays out content in rows using those columns, making responsive layouts predictable and consistent.

Simple example:
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    .col { float: left; width: 8.33%; } /* one column in a 12-column grid */
  </style>
</head>
<body>
  <div class="col">1</div>
</body>
</html>`,
  180: `Media queries in RWD apply different styles at different screen widths, so the layout reflows smoothly between phones, tablets, and desktops.

A typical mobile-first pattern:
/* Base mobile styles */
.container { width: 100%; }
/* Tablet */
@media (min-width: 768px) {
  .container { width: 750px; }
}
/* Desktop */
@media (min-width: 1200px) {
  .container { width: 1170px; }
}

** Choose breakpoints based on your content (not fixed device names) so the design never looks broken. **`,
  181: `Responsive images resize fluidly to fit their container, using max-width: 100% and the modern srcset/sizes syntax to serve the right size for each screen.

Basic technique:
img { max-width: 100%; height: auto; }

With srcset:
<img srcset="small.jpg 480w, large.jpg 1080w"
     sizes="(max-width: 600px) 480px, 1080px"
     src="large.jpg" alt="...">

** Serving appropriately sized images improves load time and data usage on mobile. **`,
  182: `Responsive videos fit their container width while keeping the aspect ratio, usually with a wrapper that uses the padding-top trick or modern aspect-ratio.

Classic technique:
.video-container {
  position: relative;
  padding-bottom: 56.25%; /* 16:9 */
  height: 0;
}
.video-container iframe {
  position: absolute;
  width: 100%; height: 100%;
}

** Using aspect-ratio: 16 / 9 on the element itself is the modern, simpler approach. **`,
  183: `Responsive frameworks such as Bootstrap and Tailwind provide ready-made grids, components, and responsive utility classes that speed up development a lot.

Popular frameworks:
    • Bootstrap: the most widely used framework with a 12-column grid
    • Tailwind CSS: a utility-first approach for fast styling
    • Bulma and Foundation: lighter alternatives with a similar philosophy

Main advantage: faster development by reducing the need to write raw CSS from scratch.`,
  184: `Ready-made RWD templates are pre-designed patterns that provide the complete structure and styles of a page or website and are usually used as a fast starting point for a project.

Advantages of using templates:
    • Saving time on initial design
    • Seeing professional implementation patterns for learning

** To learn CSS deeply, it is better to first build a project from scratch yourself, then use ready-made templates for real projects. **`,
  185: `A CSS certificate is a credential issued after passing a CSS-related exam and can be used in a resume or professional portfolio.

Important notes:
    • The exam usually includes multiple-choice questions about selectors, the box model, Flexbox, Grid, and responsive concepts
    • It is best to present CSS design projects in the portfolio alongside the certificate

** A certificate alone is not a substitute for practical skill, but it can show your theoretical knowledge to employers. **`,
  186: `SASS (Syntactically Awesome Style Sheets) is a CSS preprocessor that adds programming features such as variables, nesting, and functions to writing styles.

Sample SASS features:
    • Variables: $main-color: blue;
    • Nesting: writing child selectors inside their parent
    • Mixins: defining reusable style blocks
    • @import: splitting code into several files and combining them

** SASS code must eventually be compiled into regular CSS so browsers can use it. **`,
  187: `CSS templates are ready-made, complete web page examples that can be used as a reference or starting point for personal projects.

Common template types:
    • Landing page template
    • Personal portfolio template
    • Simple shop template

** Studying ready-made template code is a good way to learn professional layout and styling techniques. **`,
  188: `In this section, practical CSS examples are collected so the learned concepts can be practiced in the form of real examples.

Topics usually covered:
    • A product card example with shadow and transition
    • A styled form example
    • A page layout example with Grid and Flexbox

** The best way to learn is to run these examples directly in an editor and modify them to see the result. **`,
  189: `An online CSS editor is an environment that lets you write, edit, and see the real-time output of HTML and CSS code without installing any software.

Advantages of an online editor:
    • Quickly test styles without setting up a full project
    • See the code and visual output side by side
    • Great for learning and quickly experimenting with new CSS features`,
  190: `CSS snippets are short, reusable pieces of CSS code that solve a specific styling problem, such as centering an element, hiding scrollbars, or a common button style.

Examples:
.flex-center { display: flex; align-items: center; justify-content: center; }
.hide-scrollbar::-webkit-scrollbar { display: none; }

** Keep a personal library of tested snippets to speed up everyday CSS work. **`,
  191: `A CSS quiz is a set of multiple-choice questions designed to measure how well CSS concepts have been learned.

Main goals of these quizzes:
    • Checking correct understanding of selectors, the box model, Flexbox, and Grid
    • Identifying weak points for reviewing the material again
    • Preparing for job exams or certification tests

** It is recommended to take the related quiz after each section of the course to consolidate learning. **`,
  192: `CSS practical exercises are a set of short drills where you must complete the given code or produce a specific output.

Important notes about the exercises:
    • Each exercise usually focuses on one specific concept, such as a selector, property, or layout
    • Exercises consolidate the theoretical material in practice
    • It is better to try on your own first, without looking at the answer

** Learning CSS without hands-on practice is incomplete; continuous practice is the key to mastering it. **`,
  193: `CSS code challenges are more complex than simple exercises and require combining several concepts to reach a specific output.

Characteristics of the challenges:
    • They usually involve building a complete component (such as a card, form, or page section)
    • They require thinking and combining selectors, layout, and responsive techniques at once
    • They can be used as practice for technical interview preparation

** Solving challenges is the best way to move from beginner to intermediate and even advanced level in CSS. **`,
  194: `In this section, a complete website is designed using all the CSS concepts learned in the course.

Suggested steps for building the website:
    1. Create a header with the logo and a navigation menu
    2. Build a responsive main layout with Grid (sidebar + content)
    3. Style the components (buttons, cards, forms) consistently
    4. Add media queries to adapt the layout to mobile screens
    5. Do a final check of the output in the browser

** This project is an opportunity to apply all the theoretical knowledge to a real product. **`,
  195: `The CSS course syllabus is a complete list of the topics taught throughout the course, arranged logically from beginner to advanced.

Goals of the syllabus:
    • Providing an overview of the learning path ahead
    • Helping with planning and tracking progress
    • Ensuring full coverage of CSS concepts from basic to advanced

** Reviewing the syllabus periodically helps you know which stage of learning you are at and which topics remain.`,
  196: `A CSS study plan is a scheduled guide that helps CSS learning progress regularly, without things being forgotten.

A sample study plan:
    • Week one: fundamentals (selectors, colors, text, box model)
    • Week two: backgrounds, borders, display, and positioning
    • Week three: Flexbox, Grid, and responsive design
    • Week four: transitions, animations, and the final project

** Sticking to a regular plan, even with short daily time, gives better results than intense, irregular study. **`,
  197: `CSS interview preparation involves reviewing frequently asked technical questions that usually come up in front-end developer job interviews.

Common sample questions:
    • Explain the box model.
    • What is the difference between relative, absolute, and fixed positioning?
    • When do you use Flexbox vs. Grid?
    • What does box-sizing: border-box do?
    • How do media queries work for responsive design?

** In addition to reviewing theory, practice explaining concepts in plain language with practical examples. **`,
  198: `A CSS bootcamp is an intensive, project-based course that teaches CSS concepts practically and hands-on within a short time frame.

Characteristics of a good bootcamp:
    • Focus on real projects instead of theory alone
    • Fast feedback on the code you write
    • Full coverage of the path from beginner to job-ready

** Bootcamps suit people looking for fast, intensive learning with plenty of hands-on practice. **`,
  199: `The CSS reference is a complete, organized collection of CSS properties, values, and units, used as a lookup tool while writing styles.

Categories in the reference:
    • Properties organized by topic (layout, text, background, etc.)
    • Values and units (px, %, em, rem, vw, etc.)
    • Functions such as calc(), min(), max(), clamp()

** You do not need to memorize every property; knowing where to find them in the reference is more important. **`,
  200: `The CSS selectors reference lists all the ways to target elements, from simple type, class, and id selectors to attribute, pseudo-class, and pseudo-element selectors.

The main selector groups:
    • Type selectors: p, h1, div
    • Class selectors: .intro
    • ID selectors: #main
    • Attribute selectors: [type="text"]
    • Pseudo-classes: :hover, :first-child, :not()
    • Pseudo-elements: ::before, ::after, ::first-line

** The right selector keeps CSS maintainable; over-specific selectors are harder to override. **`,
  201: `The combinators reference documents how selectors relate to each other in the document tree.

The four combinators:
    • Descendant (space): div p
    • Child (>): div > p
    • Adjacent sibling (+): h1 + p
    • General sibling (~): h1 ~ p

** Combining these with good naming keeps styles predictable and easy to read. **`,
  202: `The pseudo-classes reference organizes the built-in pseudo-classes by use case: interaction, document structure, form states, and negation.

Common groups:
    • User interaction: :hover, :active, :focus, :focus-within
    • Structure: :first-child, :last-child, :nth-child(), :not()
    • Form states: :disabled, :checked, :required, :valid
    • UI state: :target, :root, :empty

** Pseudo-classes let you style states without extra classes or JavaScript. **`,
  203: `The pseudo-elements reference documents the built-in pseudo-elements used to style parts of an element.

The main pseudo-elements:
    • ::before and ::after: insert generated content before/after the element
    • ::first-letter: styles the first letter
    • ::first-line: styles the first line
    • ::selection: styles user-selected text
    • ::placeholder: styles the input placeholder

** ::before and ::after require the content property to render. **`,
  204: `At-rules in CSS start with @ and tell the browser how to behave. The most important ones are @media, @supports, @import, @font-face, and @keyframes.

The main at-rules:
    • @media: conditional styles based on viewport or device features
    • @supports: conditional styles based on feature support
    • @import: includes another stylesheet
    • @font-face: registers a custom font
    • @keyframes: defines the steps of an animation

** At-rules are the cornerstone of responsive, modern CSS. **`,
  205: `CSS functions produce values dynamically. The most important ones are calc(), min(), max(), clamp(), and color functions.

Common functions:
    • calc(100% - 50px): combines units in arithmetic
    • min(50%, 300px): picks the smaller value
    • max(50%, 300px): picks the larger value
    • clamp(1rem, 2vw, 2rem): clamps a value between min and max
    • rgb()/hsl(): produce colors

** Using these functions reduces magic numbers and makes layouts adaptive. **`,
  206: `The aural CSS reference (largely historical) documents properties for speech and audio presentation of web content, such as voice, pitch, and pause.

Example properties:
    • voice-family: which voice reads the text
    • pitch: the baseline pitch of the voice
    • pause: pause before/after speaking an element
    • speak: whether/how the text is spoken

** Most aural properties are deprecated or poorly supported; use them only for niche output — today few browsers support them. **`,
  207: `Web-safe fonts are a small set of fonts available on almost all operating systems, so they render consistently without being downloaded.

The classic stack:
font-family: Arial, Helvetica, sans-serif;
font-family: "Courier New", Courier, monospace;
font-family: Georgia, "Times New Roman", Times, serif;

** Always provide fallbacks (and end with a generic family) so the browser has a graceful option. **`,
  208: `The animatable CSS reference lists which properties can be smoothly animated between values, which matters for transitions and @keyframes.

Generally animatable:
    • Colors (color, background-color, border-color)
    • Numbers (opacity, font-weight, z-index)
    • Lengths (width, height, padding, margin, top, left)
    • Transforms (translate, rotate, scale)

** Non-animatable properties (such as display or float) switch instantly; animate alternatives instead. **`,
  209: `The CSS units reference documents absolute and relative units for sizing values.

Absolute units:
    • px: pixels (1px = 1/96 inch)
    • Other print units: pt, pc, in, cm, mm

Relative units:
    • %: relative to the parent
    • em: relative to the element's font size
    • rem: relative to the root font size
    • vw/vh: relative to the viewport width/height
    • ch/ex/cap: relative to character metrics

** Prefer relative units (rem, %, vw/vh) building adaptable, accessible interfaces. **`,
  210: `The PX-EM converter converts fixed pixel values to the relative em unit (or vice versa). Because em depends on the font size, the same px value maps to different em values in different contexts.

Formula:
em = px ÷ base font size (usually 16px)
Example: 24px ÷ 16px = 1.5em

** Use rem for sizing that should be independent of the parent font size, and em for sizing tied to the current element's font. **`,
  211: `The CSS colors reference documents named colors, hex, rgb(), hsl(), and modern color spaces such as lab() and oklch().

Formats:
    • Named color: red, blue, transparent
    • Hex: #ff0000, #f00, #ff000080 (with alpha)
    • rgb()/rgba(): rgb(255, 0, 0, 0.5)
    • hsl()/hsla(): hsl(0, 100%, 50%)

** Use a consistent color system (ideally CSS variables) so branding stays coherent. **`,
  212: `The CSS color values reference documents every way to express a color and how they compare.

Common value types:
    • Keyword colors: red, white, currentcolor
    • Hex: #RGB, #RGBA, #RRGGBB, #RRGGBBAA
    • rgb()/rgba(): integer or percentage components
    • hsl()/hsla(): hue, saturation, lightness
    • HWB, lab(), lch(), oklab(), oklch(): modern color spaces for wider gamuts

** Modern spaces (oklch etc.) give better perceptual consistency but require care with browser support. **`,
  213: `The default values reference lists the initial value of each CSS property (what applies when no value is set), which helps understand why elements look the way they do.

Examples:
    • display: inline (for most elements)
    • position: static
    • box-sizing: content-box
    • overflow: visible
    • background-color: transparent

** Knowing defaults makes debugging unexplained spacing or layout behavior much easier. **`,
  214: `The browser support reference links each CSS feature to the browsers and versions that support it, helping decide whether a feature is safe to use.

How to use it:
    • Check the feature on caniuse.com before using it
    • Prefer widely supported features for critical styles
    • Provide fallbacks (e.g. a plain background before a gradient) when support gaps matter

** Progressive enhancement keeps old browsers usable while still letting modern browsers see the polished version. **`,
  215: `JavaScript is the programming language of the web, and in this course you will learn it step by step — from basic concepts to building interactive pages and applications.

What you will learn:
    • Variables, data types, and operators
    • Conditions, loops, and functions
    • Arrays, objects, and modern ES features
    • DOM manipulation and browser events
    • AJAX, APIs, and asynchronous programming
    • Building complete projects

** JavaScript is the only programming language that runs natively in every browser — learning it unlocks the entire web. **`,
  216: `JavaScript is a high-level, interpreted programming language that adds behavior and interactivity to web pages. While HTML builds structure and CSS styles appearance, JavaScript makes the page alive.

What can JavaScript do?
    • Change HTML content and attributes dynamically
    • Respond to user actions (clicks, typing, scrolling)
    • Validate forms before submission
    • Fetch data from servers without reloading the page
    • Build entire applications (with frameworks like React)

** JavaScript runs in the browser (client-side) and, with Node.js, also on the server — one language, everywhere. **`,
  217: `JavaScript code is placed inside a <script> element. The script can live in the page head, at the end of the body, or in an external .js file.

Three common placements:
    • In the <head>: for small setup code
    • At the end of the <body>: so the DOM is ready and pages load faster
    • External file: <script src="script.js"></script> for reuse and caching

External files are recommended for real projects because they separate behavior from content and are easier to maintain and cache.`,
  218: `JavaScript has several ways to display output, each with a different purpose.

Common output methods:
    • console.log(data) — writes to the browser console (best for debugging)
    • document.write() — writes directly into the page (mostly legacy)
    • alert() — shows a popup dialog
    • innerHTML / textContent — writes into an element on the page

** Use console.log for debugging and innerHTML/textContent to render content; avoid document.write in real projects. **`,
  219: `JavaScript syntax is the set of rules that defines a correctly structured JavaScript program.

The basics:
    • Statements end with a semicolon (optional but recommended)
    • Comments: // single-line and /* multi-line */
    • Variables: let name = "KIA."; const pi = 3.14;
    • Operators: +, -, *, /, %, =, ===, &&, ||
    • Blocks are grouped with curly braces { }

** JavaScript is case-sensitive: myVar and myvar are different names. **`,
  220: `Operators in JavaScript perform calculations, comparisons, and assignments.

The main operator groups:
    • Arithmetic: +, -, *, /, %, ** (exponent)
    • Assignment: =, +=, -=, etc.
    • Comparison: ==, ===, !=, !==, >, <, >=, <=
    • Logical: &&, ||, !
    • Type: typeof, instanceof

** Prefer strict equality === and !== to avoid unexpected type coercion. **`,
  221: `Conditional statements run different code based on whether a condition is true or false.

The main forms:
    • if (condition) { ... }
    • if ... else if ... else
    • switch (value) { case ...: }
    • Ternary: condition ? valueTrue : valueFalse
    • Nullish coalescing: a ?? b

Example:
if (score >= 60) {
  console.log("Passed");
} else {
  console.log("Needs practice");
}

** Conditions are the heart of decision-making in every program. **`,
  222: `Loops repeat a block of code while a condition holds, or for each item in a collection.

The main loop types:
    • for (let i = 0; i < n; i++) { ... }
    • while (condition) { ... }
    • do ... while (condition)
    • for...of over arrays and iterables
    • for...in over object keys

** Use break to exit a loop early and continue to skip to the next iteration. **`,
  223: `Strings in JavaScript represent text and are created with single quotes, double quotes, or template literals.

Common string operations:
    • Concatenation: "Hello " + name or template literals \`Hello \${name}\`
    • Length: str.length
    • Methods: toUpperCase(), toLowerCase(), slice(), split(), replace(), includes()
    • Escape characters: \\n, \\t, \\", \\'

** Strings are immutable — methods return a new string instead of changing the original. **`,
  224: `Numbers in JavaScript include integers and decimals, plus special values like Infinity and NaN.

Number basics:
    • let age = 25; let price = 19.99;
    • Math helpers: Math.round(), Math.floor(), Math.ceil(), Math.random(), Math.max()
    • toFixed(n) formats decimals
    • Number.parseInt() and Number.parseFloat() parse strings
    • BigInt for integers beyond the safe range

** Watch out for floating-point precision issues; use rounding when displaying prices or percentages. **`,
  225: `Functions are reusable blocks of code that run when called, and they are the building blocks of every JavaScript program.

Function forms:
    • Function declaration: function greet(name) { return "Hi " + name; }
    • Arrow function: const greet = (name) => "Hi " + name;
    • Default parameters, rest parameters (...args)

** Functions are first-class values: they can be stored in variables, passed as arguments, and returned from other functions. **`,
  226: `Timers let JavaScript schedule code to run later or repeatedly.

The main timer functions:
    • setTimeout(fn, ms) — run once after ms milliseconds
    • setInterval(fn, ms) — run repeatedly every ms
    • clearTimeout() / clearInterval() — cancel the scheduled execution
    • requestAnimationFrame(cb) — sync with the screen refresh for animations

Example:
const id = setTimeout(() => console.log("Done"), 1000);
clearTimeout(id);

** Always cancel timers when they are no longer needed (e.g., on unmount) to avoid memory leaks. **`,
  227: `Objects in JavaScript store collections of key-value pairs and are the foundation of the language's data model.

Object basics:
    • Create: const user = { name: "KIA.", age: 25 };
    • Access: user.name or user["name"]
    • Add/update: user.city = "Tehran";
    • Delete: delete user.age;
    • Keys: Object.keys(obj), Object.values(obj), Object.entries(obj)

** Almost everything in JavaScript is an object or can behave like one — functions, arrays, dates, and more. **`,
  228: `Scope determines where variables are visible and accessible in your code.

The main scopes:
    • Global scope: accessible everywhere (avoid cluttering it)
    • Function scope: variables declared with var inside a function
    • Block scope: let and const inside { } blocks
    • Module scope: variables inside an ES module

** Prefer const by default; use let only when a value must change; avoid var for new code. **`,
  229: `Dates in JavaScript are handled with the Date object and store a specific moment in time.

Date basics:
    • Create: new Date(), new Date(2026, 0, 1)
    • Get: getFullYear(), getMonth(), getDate(), getTime()
    • Format: toISOString(), toLocaleDateString("en-US")
    • Compare: date1 > date2

** Months are zero-based (0 = January). Store timestamps (ISO strings) in data and format them only at display time. **`,
  230: `The Temporal API is a modern, more precise date and time proposal that replaces the awkward parts of the Date object with separate types for date-only, time-only, and time-zone-aware values.

Key Temporal types:
    • Temporal.PlainDate — a date without a time zone
    • Temporal.PlainTime — a time of day
    • Temporal.ZonedDateTime — an exact instant with a zone
    • Temporal.Duration — a length of time

** Temporal solves Timezone and calendar arithmetic problems that are painful with the Date object. **`,
  231: `Arrays in JavaScript are ordered lists of values and the workhorse of everyday data handling.

Array essentials:
    • Create: const items = ["a", "b"]; or new Array(...)
    • Add/remove: push(), pop(), unshift(), shift(), splice()
    • Transform: map(), filter(), reduce(), forEach()
    • Search: indexOf(), find(), includes(), some(), every()
    • Copy/merge: slice(), concat(), spread [...]

** Prefer map/filter/reduce over manual loops for cleaner, more readable code. **`,
  232: `A Set is a collection of unique values (no duplicates) introduced in ES6.

Set basics:
    • Create: const s = new Set([1, 2, 2, 3]); // size is 3
    • Add/delete: s.add(x), s.delete(x), s.has(x), s.clear()
    • Iterate: for (const v of s) or forEach
    • Convert: [...s] back to an array

** Sets are ideal for deduplication and fast membership checks. **`,
  233: `A Map is a collection of key-value pairs where keys can be any type (not just strings), preserving insertion order.

Map basics:
    • Create: const m = new Map();
    • Set/get: m.set(key, value), m.get(key), m.has(key)
    • Delete: m.delete(key), m.clear()
    • Size: m.size
    • Iterate: m.keys(), m.values(), m.entries(), forEach

** Use Map when you need arbitrary keys, frequent additions/deletions, or guaranteed insertion order. **`,
  234: `Iteration covers all the ways JavaScript can walk through data — arrays, strings, Sets, Maps, and objects.

Iteration tools:
    • for loop, while, do...while
    • for...of (arrays, strings, Set, Map)
    • for...in (object keys)
    • Array methods: forEach, map, filter, reduce
    • Iterators and generators

** for...of works with any iterable; for...in is only for object keys and is easy to misuse on arrays. **`,
  235: `The Math object provides mathematical constants and functions without creating an instance.

Common Math utilities:
    • Constants: Math.PI, Math.E
    • Rounding: Math.round(), Math.floor(), Math.ceil(), Math.trunc()
    • Random: Math.random() returns 0 ≤ value < 1
    • Min/max: Math.min(...), Math.max(...)
    • Power/root: Math.pow(), Math.sqrt(), Math.abs()

** Combining Math.random() and Math.floor() generates random integers: Math.floor(Math.random() * n). **`,
  236: `Regular expressions (RegExp) describe patterns for searching, matching, and replacing text.

Basic pattern syntax:
    • /pattern/flags — literals, or new RegExp("pattern")
    • char classes: [a-z], \\d (digit), \\s (space), \\w (word char)
    • quantifiers: *, +, ?, {n}
    • groups and alternation: (a|b), (?:...)
    • anchors: ^ start, $ end
    • flags: g (global), i (ignore case), m (multiline)

** Use RegExp for validation or search problems that would be tedious with plain string methods. **`,
  237: `JavaScript has a small set of data types — primitives and objects — and understanding them explains most common bugs.

Primitives:
    • string, number, boolean, undefined, null, symbol, bigint

Objects (non-primitive):
    • Object, Array, Function, Date, RegExp, Map, Set, etc.

Key facts:
    • typeof null === "object" (historical quirk)
    • Values are copied by value; objects are copied by reference
    • == coerces, === does not

** Check for null/undefined explicitly before using a value, and understand reference vs. value behavior. **`,
  238: `Errors in JavaScript are runtime exceptions that can be caught and handled gracefully.

Error handling:
    • throw new Error("message")
    • try { ... } catch (err) { ... } finally { ... }
    • Built-in error types: Error, TypeError, RangeError, ReferenceError, SyntaxError
    • Custom error classes extending Error

** Always handle expected errors (network, validation) so the app fails gracefully instead of crashing. **`,
  239: `Debugging JavaScript is the process of finding and fixing bugs. Modern browsers ship with powerful developer tools (DevTools).

The main debugging tools:
    • console.log(), console.warn(), console.error()
    • The Sources panel with breakpoints and step-through
    • The debugger; statement
    • Setting watches and inspecting scopes
    • Performance and network tabs for runtime issues

** Learn to read stack traces — they tell you exactly where an error occurred and how execution got there. **`,
  240: `A JavaScript style guide keeps code consistent, readable, and maintainable, especially in teams.

Common conventions:
    • Use const and let, never var
    • Use 2-space indentation
    • Use camelCase for variables/functions, PascalCase for classes
    • Prefer arrow functions and template literals
    • Use meaningful names and keep functions small
    • Always handle errors and avoid global pollution

** Consistency matters more than taste; adopt a linter (ESLint) and a formatter (Prettier) to enforce it automatically. **`,
  241: `The JavaScript reference is the complete, organized documentation of the language: every statement, operator, built-in object, and method.

How to use the reference:
    • Look up syntax, parameters, and return values
    • Check browser support and compatibility notes
    • Read examples to understand edge cases

** No developer memorizes everything — knowing how to find the answer in the reference is the real skill. **`,
  242: `Building JavaScript projects puts all the concepts together — from small scripts to interactive single-page apps.

Common project stages:
    1. Planning features and structure
    2. Setting up files (HTML + CSS + JS) and tooling
    3. Writing and organizing modules of code
    4. Testing interactions and edge cases
    5. Deploying and checking performance

** Start with small, focused projects (a to-do list, a quiz app, a weather widget) and add complexity gradually. **`,
  243: `JavaScript versions refer to the ECMAScript standard. ES6/ES2015 was the biggest update; new features are added yearly (ES2020, ES2021, ...).

Notable version milestones:
    • ES5 (2009): JSON, strict mode
    • ES6/ES2015: let/const, classes, arrow functions, modules, promises
    • ES2017+: async/await, spread, optional chaining, nullish coalescing
    • Modern: replaceAll, structuredClone, Temporal

** Check browser support for newer features (via caniuse) or use a transpiler (Babel) when targeting older browsers. **`,
  244: `The DOM (Document Object Model) is the browser's tree representation of the page, and JavaScript uses it to read and modify the document.

Core DOM operations:
    • Select: document.querySelector(".box"), getElementById()
    • Traverse: element.parentElement, children, nextElementSibling
    • Change content: element.textContent, element.innerHTML
    • Change attributes/styles: setAttribute(), element.style.color = "red"
    • Create/remove: createElement(), appendChild(), remove()

** The DOM API is the bridge between your JavaScript code and the visible page — everything you interact with passes through it. **`,
  245: `HTML events are actions (clicks, typing, loading) that JavaScript can listen to and respond to.

Essential event patterns:
    • Listen: element.addEventListener("click", handler)
    • Common events: click, input, change, submit, keydown, scroll, load
    • Pass data: event.target, event.key, event.preventDefault()
    • Remove: removeEventListener

** Use addEventListener instead of inline onclick attributes, and always clean up listeners when a component unmounts. **`,
  246: `This section puts the first HTML/JS steps together — wiring a button to change content, showing/hiding elements, and reading input.

A first example:
<button id="btn">Click me</button>
<p id="out">Hello</p>
<script>
  document.getElementById("btn").addEventListener("click", () => {
    document.getElementById("out").textContent = "You clicked!";
  });
</script>

** Small interactive examples like this are the fastest way to connect HTML structure with JavaScript behavior. **`,
  247: `Advanced JavaScript covers the topics that power real applications: closures, this-binding, prototypes, async patterns, and performance.

Core advanced topics:
    • Closures and the module pattern
    • this behavior and arrow functions
    • Object prototypes and inheritance
    • Event loop, promises, async/await
    • Memory management, garbage collection

** Deeply understanding these topics separates junior from senior-level JavaScript developers. **`,
  248: `Advanced functions in JavaScript explore first-class functions: higher-order functions, closures, currying, and callbacks.

Key concepts:
    • Higher-order functions: functions that take or return functions
    • Callbacks: passing a function to run later
    • Closure: a function remembering its outer variables
    • .bind()/.call()/.apply(): controlling this

** Higher-order functions like map/filter and callbacks are everywhere in real code — mastering them unlocks functional-style programming. **`,
  249: `Advanced objects cover patterns like prototypes, getters/setters, Object.defineProperty, and composition.

Key topics:
    • Prototype chains and Object.create()
    • Getters and setters (get/set)
    • Property descriptors (writable, enumerable, configurable)
    • Object.freeze(), Object.seal()
    • Object spread and restructuring patterns

** Understanding prototypes is key to how classes and inheritance actually work under the hood. **`,
  250: `Classes are syntactic sugar over JavaScript's prototype-based inheritance, introduced in ES6.

Class essentials:
    • class User { constructor(name) { this.name = name; } }
    • Methods and static methods
    • Getters/setters inside classes
    • extends for inheritance, super() for the parent constructor

** Under the hood classes still use prototypes — knowing both mental models helps you debug inheritance issues. **`,
  251: `JSON (JavaScript Object Notation) is the standard text format for exchanging data between server and client.

JSON essentials:
    • JSON.stringify(value) — convert JS → JSON string
    • JSON.parse(text) — convert JSON string → JS value
    • Keys must be double-quoted; no comments, functions, or undefined

** Almost every API returns JSON; always parse with try/catch because malformed responses are common. **`,
  252: `Asynchronous JavaScript handles tasks that wait (network, timers) via the event loop, promises, and async/await.

The async toolkit:
    • Callbacks (legacy)
    • Promises: new Promise((resolve, reject) => ...), .then(), .catch(), .finally()
    • async/await for readable sequential code
    • Promise.all(), Promise.race(), Promise.allSettled()
    • fetch() for network requests

** async/await does not block the main thread — the event loop keeps handling other tasks while awaiting. **`,
  253: `ES modules let you split code into files, each with its own scope, sharing functionality through import/export.

Module basics:
    • Export: export function greet() {} or export default ...
    • Import: import { greet } from "./utils.js";
    • Dynamic import: import("./utils.js").then(...)
    • Modules are strict-mode by default

** Modules fix global-scope pollution and make dependency graphs explicit and tree-shakeable. **`,
  254: `Metaprogramming in JavaScript uses Reflect, Proxy, and symbol hooks to intercept and customize object behavior.

Key tools:
    • Proxy: wraps an object to intercept get/set/apply/etc.
    • Reflect: methods mirroring proxy traps for forwarding operations
    • Symbol, Symbol.iterator, Symbol.toPrimitive for custom behavior
    • Object.defineProperty for low-level descriptors

** Proxies are used by frameworks (Vue, MobX) to implement reactivity — the foundation of modern UI libraries. **`,
  255: `Typed arrays provide views over binary data, letting JavaScript read and write ArrayBuffers (raw memory) in a structured way.

Typed array types:
    • Int8Array, Uint8Array, Uint8ClampedArray
    • Int16Array, Uint16Array
    • Int32Array, Uint32Array, Float32Array, Float64Array

Common uses:
    • Processing binary files (images, audio)
    • WebGL graphics, Canvas pixel data
    • Parsing protocols and file formats

** Typed arrays are the bridge between JavaScript and efficient binary data processing. **`,
  256: `DOM navigation is moving between elements in the document tree using parent, child, and sibling relationships.

Navigation properties:
    • Parent: element.parentElement
    • Children: element.children (elements only) or childNodes
    • First/last: firstElementChild, lastElementChild
    • Siblings: nextElementSibling, previousElementSibling

** Prefer querySelector for direct selection; use navigation when the structure is dynamic and relationships matter. **`,
  257: `The Browser API (also called Web APIs) is the set of browser-provided interfaces available to JavaScript: storage, location, history, and more.

Common browser APIs:
    • localStorage / sessionStorage
    • location, history, navigator
    • Fetch API, WebSocket, EventSource
    • Geolocation, Notification, Clipboard
    • Web Workers

** These APIs give the page access to the browser environment — bookmarks, storage, networking, devices — beyond pure JavaScript. **`,
  258: `The Web API reference documents the browser interfaces used to build modern web behavior.

Common interface groups:
    • Document and DOM events
    • Fetch, Headers, Response
    • Storage (localStorage, sessionStorage)
    • Canvas and WebGL
    • Communication: WebSocket, Server-Sent Events

** Web APIs evolve quickly; check compatibility (caniuse/Can I Use) and feature-detect before using newer interfaces. **`,
  259: `Graphics in the browser are drawn with Canvas (2D pixel drawing) and SVG (scalable vector shapes), plus WebGL for 3D.

The options:
    • Canvas 2D: pixel-based drawing with a draw context
    • SVG: XML vector shapes inside the DOM
    • WebGL / WebGPU: hardware-accelerated 3D
    • CSS gradients/shapes for simple visuals

** Choose SVG for icons and data charts, Canvas for dynamic pixel effects (games/particles), and WebGL for real 3D. **`,
  260: `Old web technologies like Applets, Flash, ActiveX, and Silverlight were eras of plugin-based interactivity, now replaced by open standards.

What replaced them:
    • <canvas>, WebGL, and SVG replaced Flash graphics
    • HTML5 video/audio replaced media plugins
    • Web APIs replaced native plugins entirely

** Modern browsers dropped plugin support for security and performance — no new project should target these technologies. **`,
  261: `AJAX (Asynchronous JavaScript and XML) lets the page fetch data from a server and update content without a full reload. Modern code uses fetch(), but the concept is the same.

A modern example:
fetch("/api/data")
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

** Today, JSON has replaced XML, and fetch() replaces the old XMLHttpRequest, but the async data-exchange idea is unchanged. **`,
  262: `jQuery is a legacy JavaScript library that simplified DOM selection, events, and AJAX with a concise $ API — and paved the way for modern frameworks.

Classic jQuery:
$("#btn").on("click", function () {
  $("body").addClass("active");
});

** Modern projects use native APIs (querySelector, fetch) or frameworks — learn jQuery only for maintaining older codebases. **`,
  263: `JSONP (JSON with Padding) was a technique to bypass the browser's same-origin policy by loading data via a <script> tag callback.

How it worked:
    • The server wrapped JSON in a function call: callback({...})
    • The client defined window.callback and injected a <script src="...callback=...">

** JSONP is obsolete; use CORS with fetch() instead. **`,
  264: `This section collects practical JavaScript code examples to practice the learned concepts in the form of real, working programs.

Sample example topics:
    • Interactive input and event handling
    • Arrays and object transformations
    • Timers, animations, and DOM updates
    • Fetch requests and rendering results

** The best way to learn is to run these examples directly in an editor and modify them to see the result. **`,
  // __LESSON_ENTRIES__
};

/** English playground starters for lessons whose fa starter contains Persian text. */
export const EN_LESSON_PLAYGROUNDS: Record<number, CourseDbPlayground> = {
  1: { language: 'html', html: '<h1>HTML HOME</h1><p>Welcome to the HTML course!</p>' },
  2: { language: 'html', html: '<h1>HTML Introduction</h1><p>Introduction to HTML</p>' },
  3: { language: 'html', html: '<h1>HTML Editors</h1><p>HTML editors</p>' },
  4: { language: 'html', html: '<h1>HTML Basic</h1><p>HTML fundamentals</p>' },
  5: { language: 'html', html: '<h1>HTML Elements</h1><p>HTML elements</p>' },
  6: { language: 'html', html: '<h1>HTML Attributes</h1><p>HTML attributes</p>' },
  7: {
    language: 'html',
    html: '<h1>HTML Headings</h1><h2>Level 2 heading</h2><h3>Level 3 heading</h3>',
  },
  8: { language: 'html', html: '<h1>HTML Paragraphs</h1><p>This is a text paragraph.</p>' },
  9: {
    language: 'html',
    html: '<h1>HTML Styles</h1><p style="color:blue;">This text is blue.</p>',
  },
  10: {
    language: 'html',
    html: '<h1>HTML Formatting</h1><p><b>Bold</b> and <i>italic</i> and <mark>highlighted</mark></p>',
  },
  11: {
    language: 'html',
    html: '<h1>HTML Quotations</h1><blockquote>This is a quotation.</blockquote>',
  },
  12: {
    language: 'html',
    html: '<h1>HTML Comments</h1><!-- This comment is not visible in the browser --><p>Paragraph text.</p>',
  },
  13: {
    language: 'html',
    html: '<h1>HTML Colors</h1><p style="background-color:Tomato;">Tomato color</p>',
  },
  14: {
    language: 'html',
    html: '<h1>HTML CSS</h1><style>h1 {color:red;}</style><h1>This heading is red</h1>',
  },
  15: {
    language: 'html',
    html: '<h1>HTML Links</h1><a href="https://google.com">Go to Google</a>',
  },
  16: {
    language: 'html',
    html: '<h1>HTML Images</h1><img src="https://via.placeholder.com/150" alt="Sample image">',
  },
  17: {
    language: 'html',
    html: '<h1>HTML Project</h1><p>Final project of the HTML section</p>',
  },
  19: { language: 'html', html: '<head><title>My Page Title</title></head><h1>Sample page</h1>' },
  20: {
    language: 'html',
    html: '<h1>HTML Tables</h1><table border="1"><tr><th>Name</th><th>Age</th></tr><tr><td>KIA.</td><td>25</td></tr></table>',
  },
  21: { language: 'html', html: '<h1>HTML Lists</h1><ul><li>Coffee</li><li>Tea</li></ul>' },
  22: {
    language: 'html',
    html: '<h1>HTML Block & Inline</h1><div style="background:yellow;">I am a block element</div><span style="background:red;">I am inline</span>',
  },
  23: {
    language: 'html',
    html: '<h1>HTML Div</h1><div style="padding:20px; border:1px solid;">Text inside the div</div>',
  },
  24: {
    language: 'html',
    html: '<h1>HTML Classes</h1><style>.my-box {background:lightgray; padding:10px;}</style><div class="my-box">My class</div>',
  },
  25: {
    language: 'html',
    html: '<h1>HTML Id</h1><style>#main {color:red;}</style><div id="main">Main id</div>',
  },
  26: {
    language: 'html',
    html: '<h1>HTML Buttons</h1><button type="button">Click me!</button>',
  },
  28: {
    language: 'html',
    html: '<h1>HTML JavaScript</h1><button onclick="alert(\'Hi!\')">Click me</button>',
  },
  29: {
    language: 'html',
    html: '<h1>HTML File Paths</h1><img src="/images/picture.jpg" alt="File path">',
  },
  30: { language: 'html', html: '<head><title>Head tag contents</title></head><h1>Hello</h1>' },
  31: {
    language: 'html',
    html: '<h1>HTML Layout</h1><header>Header</header><nav>Navigation</nav><section>Main section</section><footer>Footer</footer>',
  },
  32: {
    language: 'html',
    html: '<h1>HTML Responsive</h1><meta name="viewport" content="width=device-width, initial-scale=1.0"><p>This page is responsive</p>',
  },
  34: {
    language: 'html',
    html: '<h1>HTML Semantics</h1><article><h2>Article</h2><p>Article text</p></article>',
  },
  35: {
    language: 'html',
    html: '<h1>HTML Style Guide</h1><p>HTML coding guidelines</p>',
  },
  36: {
    language: 'html',
    html: '<h1>HTML Entities</h1><p>Less than: &lt; and greater than: &gt;</p>',
  },
  37: {
    language: 'html',
    html: '<h1>HTML Symbols</h1><p>Euro sign: &euro; and copyright: &copy;</p>',
  },
  38: {
    language: 'html',
    html: '<h1>HTML Emojis</h1><p>Emojis: &#128512; &#128525; &#128151;</p>',
  },
  39: {
    language: 'html',
    html: '<h1>HTML Charsets</h1><meta charset="UTF-8"><p>UTF-8 support</p>',
  },
  40: {
    language: 'html',
    html: '<h1>HTML URL Encode</h1><p>Web address encoding</p>',
  },
  41: {
    language: 'html',
    html: '<h1>HTML vs. XHTML</h1><p>Comparing HTML and XHTML</p>',
  },
  42: {
    language: 'html',
    html: '<h1>HTML Forms</h1><form><label>Name:</label><input type="text"><br><input type="submit"></form>',
  },
  44: {
    language: 'html',
    html: '<h1>HTML Form Elements</h1><form><input type="text" placeholder="Text"><br><textarea>Textarea</textarea></form>',
  },
  45: {
    language: 'html',
    html: '<h1>HTML Input Types</h1><form><input type="email" placeholder="Email"><br><input type="password" placeholder="Password"></form>',
  },
  46: {
    language: 'html',
    html: '<h1>HTML Input Attributes</h1><form><input type="text" placeholder="Type here" required></form>',
  },
  47: {
    language: 'html',
    html: '<h1>Input Form Attributes</h1><form><input type="text" value="Default value"></form>',
  },
  57: {
    language: 'html',
    html: '<h1>HTML Drag and Drop</h1><p>Drag and Drop API</p>',
  },
  58: {
    language: 'html',
    html: '<h1>HTML Web Storage</h1><button onclick="localStorage.setItem(\'name\', \'KIA.\')">Save in browser</button>',
  },
  59: {
    language: 'html',
    html: '<h1>HTML Web Workers</h1><p>Web workers for background processing</p>',
  },
  50: {
    language: 'html',
    html: '<h1>HTML Media</h1><p>HTML media includes video and audio</p>',
  },
  55: {
    language: 'html',
    html: '<h1>HTML Web APIs</h1><p>Introduction to Web APIs</p>',
  },
  56: {
    language: 'html',
    html: '<h1>HTML Geolocation</h1><button onclick="navigator.geolocation.getCurrentPosition(function(p){alert(p.coords.latitude)})">Get location</button>',
  },
  61: { language: 'html', html: '<h1>HTML Cert</h1><p>HTML certificate</p>' },
  62: { language: 'html', html: '<h1>HTML Examples</h1><p>Many HTML examples</p>' },
  63: { language: 'html', html: '<h1>HTML Editor</h1><p>Getting to know HTML editors</p>' },
  68: { language: 'html', html: '<h1>HTML Syllabus</h1><p>Course syllabus</p>' },
  69: { language: 'html', html: '<h1>HTML Study Plan</h1><p>Study plan</p>' },
  70: { language: 'html', html: '<h1>HTML Interview Prep</h1><p>HTML interview preparation</p>' },
  71: { language: 'html', html: '<h1>HTML Bootcamp</h1><p>HTML bootcamp</p>' },
  64: { language: 'html', html: '<h1>HTML Quiz</h1><p>HTML quiz</p>' },
  65: { language: 'html', html: '<h1>HTML Exercises</h1><p>HTML exercises</p>' },
  66: { language: 'html', html: '<h1>HTML Challenges</h1><p>HTML challenges</p>' },
  67: { language: 'html', html: '<h1>HTML Website</h1><p>Building a complete website with HTML</p>' },
  72: { language: 'html', html: '<h1>HTML Summary</h1><p>HTML course summary</p>' },
  73: { language: 'html', html: '<h1>HTML Accessibility</h1><p>Accessibility in HTML</p>' },
  74: { language: 'html', html: '<h1>HTML Tag List</h1><p>Complete list of HTML tags</p>' },
  79: { language: 'html', html: '<h1>HTML Colors</h1><p>Color reference</p>' },
  80: { language: 'html', html: '<h1>HTML Canvas</h1><p>Canvas reference</p>' },
  81: { language: 'html', html: '<h1>HTML Audio/Video</h1><p>Audio and video reference</p>' },
  82: { language: 'html', html: '<h1>HTML Doctypes</h1><p>Doctype types</p>' },
  75: { language: 'html', html: '<h1>HTML Attributes</h1><p>List of HTML attributes</p>' },
  76: { language: 'html', html: '<h1>HTML Global Attributes</h1><p>HTML global attributes</p>' },
  77: { language: 'html', html: '<h1>HTML Browser Support</h1><p>Browser support</p>' },
  78: {
    language: 'html',
    html: '<h1>HTML Events</h1><button onclick="alert(\'Clicked\')">Click event</button>',
  },
  83: { language: 'html', html: '<h1>HTML Character Sets</h1><p>Character sets</p>' },
  84: { language: 'html', html: '<h1>HTML URL Encode</h1><p>URL encoding reference</p>' },
  85: { language: 'html', html: '<h1>HTML Lang Codes</h1><p>HTML language codes</p>' },
  86: { language: 'html', html: '<h1>HTTP Messages</h1><p>HTTP messages</p>' },
  87: { language: 'html', html: '<h1>HTTP Methods</h1><p>HTTP methods (GET, POST)</p>' },
  88: { language: 'html', html: '<h1>PX to EM Converter</h1><p>PX to EM converter</p>' },
  89: { language: 'html', html: '<h1>Keyboard Shortcuts</h1><p>Keyboard shortcuts</p>' },
  90: {
    language: 'css',
    html: "<h1>CSS HOME</h1><div class='demo'>Hello CSS world</div>",
    css: '.demo { color: blue; font-size: 20px; }',
  },
  91: {
    language: 'css',
    html: '<h1>CSS Introduction</h1><p>Introduction</p>',
    css: 'p { color: green; }',
  },
  92: {
    language: 'css',
    html: '<h1>CSS Syntax</h1><p>Syntax</p>',
    css: 'p { color: red; font-weight: bold; }',
  },
  93: {
    language: 'css',
    html: "<div id='main' class='box'>Selector</div>",
    css: '#main { background: lightgray; }\n.box { padding: 10px; }',
  },
  94: {
    language: 'css',
    html: '<h1>How to add CSS</h1><p>Internal styling</p>',
    css: 'p { color: blue; }',
  },
  95: {
    language: 'css',
    html: '<h1>CSS Comments</h1><div>Comment</div>',
    css: '/* This is a comment */\ndiv { color: teal; }',
  },
  96: {
    language: 'css',
    html: '<p>Fixing common errors</p>',
    css: 'p { color: orange; }',
  },
  97: {
    language: 'css',
    html: '<h1>Colors</h1><div>Colored box</div>',
    css: 'div { background-color: tomato; color: white; padding: 20px; }',
  },
  98: {
    language: 'css',
    html: "<h1>Background</h1><div class='bg'>Text</div>",
    css: ".bg { background: lightblue url('https://via.placeholder.com/20'); padding: 20px; }",
  },
  99: {
    language: 'css',
    html: "<h1>Borders</h1><div class='b'>Box with a border</div>",
    css: '.b { border: 2px solid red; padding: 10px; }',
  },
  100: {
    language: 'css',
    html: "<div class='m'>Outer margin</div><div>Below</div>",
    css: '.m { margin: 20px; background: #eee; }',
  },
  101: {
    language: 'css',
    html: "<div class='p'>Inner padding</div>",
    css: '.p { padding: 30px; background: yellow; }',
  },
  102: {
    language: 'css',
    html: "<div class='s'>Height and width</div>",
    css: '.s { height: 50px; width: 150px; background: pink; }',
  },
  103: {
    language: 'css',
    html: "<h1>Box Model</h1><div class='bm'>Content</div>",
    css: '.bm { width: 200px; padding: 10px; border: 5px solid gray; margin: 20px; }',
  },
  104: {
    language: 'css',
    html: '<h1>Outline</h1><div>Box with an outline</div>',
    css: 'div { outline: 2px solid red; outline-offset: 5px; padding: 10px; }',
  },
  105: {
    language: 'css',
    html: "<h1>Text styling</h1><p class='t'>Sample text</p>",
    css: '.t { color: navy; text-align: center; text-transform: uppercase; }',
  },
  106: {
    language: 'css',
    html: '<p>Different fonts</p>',
    css: "p { font-family: 'Arial', sans-serif; font-size: 20px; }",
  },
  107: {
    language: 'css',
    html: '<h1>Icons</h1><span style=\'font-size:30px;\'>&#9733;</span>',
    css: '',
  },
  108: {
    language: 'css',
    html: "<a href='#'>My link</a>",
    css: 'a { color: darkgreen; text-decoration: none; }\na:hover { color: red; }',
  },
  114: {
    language: 'css',
    html: "<div class='off'>Offset element</div>",
    css: '.off { position: relative; top: 10px; left: 20px; }',
  },
  115: {
    language: 'css',
    html: "<div class='z1'>Layer 1</div><div class='z2'>Layer 2</div>",
    css: '.z1 { position: absolute; z-index: 1; background: white; width: 100px; height: 100px; border: 1px solid; }\n.z2 { position: absolute; z-index: 2; background: red; width: 100px; height: 100px; top: 20px; left: 20px; color: white; }',
  },
  116: {
    language: 'css',
    html: "<div class='ov'>Long text that does not fit in the box and causes scrolling ...</div>",
    css: '.ov { width: 100px; height: 50px; overflow: auto; border: 1px solid; background: #eee; }',
  },
  109: {
    language: 'css',
    html: '<ul><li>Topic 1</li><li>Topic 2</li></ul>',
    css: 'ul { list-style-type: square; }',
  },
  110: {
    language: 'css',
    html: "<table border='1'><tr><th>Name</th><th>Age</th></tr><tr><td>KIA.</td><td>25</td></tr></table>",
    css: 'th { background: #f2f2f2; }',
  },
  111: {
    language: 'css',
    html: "<div class='d'>Block</div><span>Inline 1</span><span>Inline 2</span>",
    css: '.d { display: block; background: orange; }\nspan { display: inline; background: #f1f1f1; }',
  },
  112: {
    language: 'css',
    html: "<div class='mw'>Max width 300px</div>",
    css: '.mw { max-width: 300px; background: #ccc; margin: auto; }',
  },
  113: {
    language: 'css',
    html: "<div class='p1'>Static</div><div class='p2'>Relative</div>",
    css: '.p1 { position: static; }\n.p2 { position: relative; left: 30px; background: lightgray; }',
  },
  117: {
    language: 'css',
    html: "<div class='f1'>Float left</div><div class='f2'>Float right</div>",
    css: '.f1 { float: left; width: 100px; background: red; color: white; }\n.f2 { float: right; width: 100px; background: blue; color: white; }',
  },
  118: {
    language: 'css',
    html: "<div class='ib'>Block 1</div><div class='ib'>Block 2</div>",
    css: '.ib { display: inline-block; width: 100px; height: 50px; background: purple; color: white; }',
  },
  119: {
    language: 'css',
    html: "<div class='c'>Centered</div>",
    css: '.c { width: 200px; margin: 0 auto; background: green; color: white; text-align: center; }',
  },
  120: {
    language: 'css',
    html: '<div><p>Direct child</p><span><p>Grandchild</p></span></div>',
    css: 'div > p { color: red; }',
  },
  121: {
    language: 'css',
    html: "<a href='#'>Hover me</a>",
    css: 'a:hover { color: red; }',
  },
  122: {
    language: 'css',
    html: "<p class='pe'>This text has special styling at the start.</p>",
    css: '.pe::first-letter { font-size: 30px; color: red; }',
  },
  123: {
    language: 'css',
    html: "<div class='op'>Transparent 0.5</div>",
    css: '.op { background: red; opacity: 0.5; padding: 20px; color: white; }',
  },
  124: {
    language: 'css',
    html: "<ul class='nav'><li>Home</li><li>About</li><li>Contact</li></ul>",
    css: '.nav { list-style: none; display: flex; background: #333; padding: 10px; color: white; }\n.nav li { margin-right: 20px; }',
  },
  125: {
    language: 'css',
    html: "<div class='dd'>Hover to open the menu</div>",
    css: '.dd { display: inline-block; padding: 10px; background: #eee; }\n.dd:hover { background: #ccc; }',
  },
  126: {
    language: 'css',
    html: "<div class='g'><img src='https://via.placeholder.com/150'></div>",
    css: ".g { border: 1px solid #ccc; padding: 10px; display: inline-block; }",
  },
  127: {
    language: 'css',
    html: "<div class='sp'>Image sprite</div>",
    css: ".sp { width: 100px; height: 100px; background: url('https://via.placeholder.com/100'); }",
  },
  128: {
    language: 'css',
    html: "<input type='text' placeholder='Name'>",
    css: "input[type='text'] { background: #eee; border: 1px solid blue; }",
  },
  129: {
    language: 'css',
    html: "<form><input type='text' placeholder='Email'><br><input type='submit'></form>",
    css: 'input { padding: 10px; margin: 5px; }',
  },
  130: {
    language: 'css',
    html: "<ol class='cnt'><li>First</li><li>Second</li></ol>",
    css: "ol.cnt { counter-reset: item; list-style: none; }\nol.cnt li { counter-increment: item; }\nol.cnt li::before { content: counter(item) '. '; font-weight: bold; }",
  },
  131: {
    language: 'css',
    html: "<div class='u'>Pixel unit</div>",
    css: '.u { font-size: 20px; padding: 10px; }',
  },
  132: {
    language: 'css',
    html: "<div class='par'><p>Child</p></div>",
    css: '.par { color: blue; }\np { color: inherit; }',
  },
  133: {
    language: 'css',
    html: "<div id='sid' class='cls'>Specificity</div>",
    css: '#sid { color: red; }\n.cls { color: blue; }',
  },
  134: {
    language: 'css',
    html: "<p class='imp'>!important</p>",
    css: '.imp { color: blue !important; }',
  },
  135: {
    language: 'css',
    html: "<div class='math'>calc</div>",
    css: '.math { width: calc(100% - 50px); background: lightblue; }',
  },
  136: { language: 'css', html: '<p>Optimization</p>', css: '' },
  137: { language: 'css', html: '<p>Accessibility</p>', css: '' },
  138: {
    language: 'css',
    html: '<header>Header</header><nav>Nav</nav><main>Content</main>',
    css: 'header { background: #333; color: white; padding: 10px; }',
  },
  139: {
    language: 'css',
    html: "<div class='r'>Rounded corner</div>",
    css: '.r { border: 2px solid black; border-radius: 25px; padding: 20px; width: 200px; }',
  },
  140: { language: 'css', html: '<div class=\'bi\'>Border image</div>', css: '.bi { border: 10px solid transparent; padding: 15px; border-image: url(https://via.placeholder.com/10) 30 stretch; }' },
  141: { language: 'css', html: '<div class=\'bgm\'>Multiple backgrounds</div>', css: '.bgm { background: url(https://via.placeholder.com/50) left top no-repeat, lightblue; height: 100px; }' },
  143: { language: 'css', html: '<div class=\'grad\'>Linear gradient</div>', css: '.grad { background: linear-gradient(to right, red, yellow); padding: 20px; }' },
  144: { language: 'css', html: '<div class=\'sh\'>Box shadow</div>', css: '.sh { box-shadow: 10px 10px 5px gray; padding: 20px; width: 100px; background: white; }' },
  145: { language: 'css', html: '<div class=\'te\'>Long text that overflows the box...</div>', css: '.te { width: 100px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border: 1px solid; }' },
  146: { language: 'css', html: '<p>Custom font</p>', css: '@font-face { font-family: myFont; src: url(sansation_light.woff); }\np { font-family: myFont; }' },
  147: { language: 'css', html: '<div class=\'t2\'>Rotation</div>', css: '.t2 { width: 100px; height: 100px; background: red; transform: rotate(20deg); }' },
  148: { language: 'css', html: '<div class=\'t3\'>3D rotation</div>', css: '.t3 { width: 100px; height: 100px; background: blue; transform: rotateX(150deg); }' },
  149: { language: 'css', html: '<div class=\'tr\'>Hover over to change</div>', css: '.tr { width: 100px; height: 100px; background: red; transition: width 2s; }\n.tr:hover { width: 300px; }' },
  150: { language: 'css', html: '<div class=\'an\'>Animation</div>', css: '@keyframes example { from {background-color: red;} to {background-color: yellow;} }\n.an { width: 100px; height: 100px; background-color: red; animation-name: example; animation-duration: 4s; }' },
  151: { language: 'css', html: '<div class=\'tooltip\'>Hover<div class=\'tooltiptext\'>Tooltip text</div></div>', css: '.tooltip { position: relative; display: inline-block; border-bottom: 1px dotted black; }\n.tooltip .tooltiptext { visibility: hidden; width: 120px; background-color: black; color: #fff; text-align: center; border-radius: 6px; padding: 5px 0; position: absolute; z-index: 1; }\n.tooltip:hover .tooltiptext { visibility: visible; }' },
  153: { language: 'css', html: '<p>Image modal</p>' },
  159: { language: 'css', html: '<div class=\'mask\'>Mask</div>', css: '.mask { -webkit-mask-image: url(https://via.placeholder.com/50); mask-image: url(https://via.placeholder.com/50); }' },
  160: { language: 'css', html: '<button class=\'btn\'>My button</button>', css: '.btn { background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; }' },
  162: { language: 'css', html: '<div class=\'mc\'>Multiple columns to split long text into parts...</div>', css: '.mc { column-count: 3; column-gap: 40px; column-rule: 1px solid lightblue; }' },
  164: { language: 'css', html: '<div class=\'var\'>CSS variables</div>', css: ':root { --main-bg-color: coral; }\n.var { background-color: var(--main-bg-color); padding: 20px; }' },
  167: { language: 'css', html: '<div class=\'mq\'>Color changes with width</div>', css: '@media only screen and (max-width: 600px) {\n  .mq { background: red; color: white; padding: 20px; }\n}' },
  174: { language: 'css', html: '<div class=\'gi\'><div style=\'grid-column: 1 / 3;\'>1 (spans two columns)</div><div>2</div></div>', css: '.gi { display: grid; grid-template-columns: auto auto; background: orange; gap: 5px; }' },
  177: { language: 'css', html: '<h1>RWD Introduction</h1><p>Responsive web design</p>' },
  178: { language: 'css', html: '<h1>Viewport</h1><p>Viewport meta tag</p>' },
  180: { language: 'css', html: '<div class=\'rwd-mq\'>Changes with width</div>', css: '@media only screen and (max-width: 600px) {\n  .rwd-mq { background: lightcoral; padding: 20px; }\n}' },
  183: { language: 'css', html: '<p>RWD frameworks</p>' },
  184: { language: 'css', html: '<p>RWD templates</p>' },
  185: { language: 'css', html: '<h1>CSS Certificate</h1>' },
  186: { language: 'css', html: '<p>SASS tutorial</p>' },
  187: { language: 'css', html: '<p>CSS ready-made templates</p>' },
  188: { language: 'css', html: '<div class=\'ex\'>CSS Example</div>', css: '.ex { border: 1px solid black; padding: 10px; }' },
  189: { language: 'css', html: '<p>CSS editor</p>' },
  190: { language: 'css', html: '<p>CSS code snippets</p>' },
  191: { language: 'css', html: '<p>CSS quiz</p>' },
  192: { language: 'css', html: '<p>CSS exercises</p>' },
  193: { language: 'css', html: '<p>CSS code challenges</p>' },
  194: { language: 'css', html: '<p>Website with CSS</p>' },
  195: { language: 'css', html: '<p>CSS course syllabus</p>' },
  196: { language: 'css', html: '<p>CSS study plan</p>' },
  197: { language: 'css', html: '<p>CSS interview preparation</p>' },
  198: { language: 'css', html: '<p>CSS bootcamp</p>' },
  199: { language: 'css', html: '<p>CSS complete reference</p>' },
  200: { language: 'css', html: '<p>Selector list</p>' },
  201: { language: 'css', html: '<p>Combinators</p>' },
  202: { language: 'css', html: '<p>Pseudo-classes</p>' },
  203: { language: 'css', html: '<p>Pseudo-elements</p>' },
  204: { language: 'css', html: '<p>At-rules like @media</p>' },
  205: { language: 'css', html: '<p>CSS functions like calc()</p>' },
  206: { language: 'css', html: '<p>Aural reference</p>' },
  207: { language: 'css', html: '<p>Web-safe fonts</p>' },
  208: { language: 'css', html: '<p>Animatable properties</p>' },
  209: { language: 'css', html: '<p>Measurement units</p>' },
  210: { language: 'css', html: '<p>PX to EM converter</p>' },
  211: { language: 'css', html: '<p>Color reference</p>' },
  212: { language: 'css', html: '<p>Color values</p>' },
  213: { language: 'css', html: '<p>Default CSS values</p>' },
  214: { language: 'css', html: '<p>Browser support for CSS</p>' },
  // __PLAYGROUND_ENTRIES__
};

/** Build the English overlay consumed by `buildCourseCatalog`. */
export function buildCourseDbEnOverlay(): CourseDbEnOverlay {
  const lessons: Record<number, CourseDbEnLesson> = {};
  for (const [id, description] of Object.entries(EN_LESSON_DESCRIPTIONS)) {
    lessons[Number(id)] = {
      description,
      playground: EN_LESSON_PLAYGROUNDS[Number(id)] ?? null,
    };
  }
  return { courses: EN_COURSE_DESCRIPTIONS, lessons };
}
