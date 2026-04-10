const fs = require('fs');
let css = fs.readFileSync('index.css', 'utf-8');

// Replace standard th sticky
css = css.replace(/\.tracker-table th \{\n  font-weight: 600;\n  color: var\(--text-secondary\);\n  font-size: 0\.85rem;\n  background: var\(--bg-elevated\);\n  backdrop-filter: var\(--backdrop-blur\);\n  -webkit-backdrop-filter: var\(--backdrop-blur\);\n  position: sticky;\n  top: 0;\n  z-index: 10; \/\* Make headers sit above the body rows \*\/\n/g, 
`.tracker-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

.tracker-table th {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.85rem;
  background: var(--bg-elevated);
  backdrop-filter: var(--backdrop-blur);
  -webkit-backdrop-filter: var(--backdrop-blur);
`);

// Remove first row fixed height and 2nd row top
css = css.replace(/\.tracker-table thead tr:first-child th \{\n  height: 48px;.*?\n\}\n\n\.tracker-table thead tr:nth-child\(2\) th \{\n  top: 48px;.*?\n\}\n\n/g, '');

fs.writeFileSync('index.css', css);
console.log("Replaced successfully!");
