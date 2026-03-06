import { marked } from "marked";
import { Message, SOCIAL_DATA } from "../models";
import { Timestamp } from "firebase/firestore";

export function createButton(
  buttonText: string,
  buttonType: string,
  buttonId: string,
  buttonClass: string,
  icon?: string,
): HTMLElement {
  const newButton = document.createElement("button");
  newButton.setAttribute("type", buttonType);
  newButton.setAttribute("id", buttonId);
  newButton.setAttribute("class", buttonClass);
  if (icon) {
    const buttonIconSpan = document.createElement("span");
    buttonIconSpan.setAttribute("class", "material-symbols-outlined");
    const buttonIcon = document.createTextNode(icon);
    buttonIconSpan.appendChild(buttonIcon);
    newButton.appendChild(buttonIconSpan);
  }
  const buttonTextElm = document.createTextNode(buttonText);
  newButton.appendChild(buttonTextElm);
  return newButton;
}

export function createLink(linkText: string, url: string, external: boolean) {
  const newLink = document.createElement("a")
  newLink.textContent = linkText;
  if (url != "") {
    newLink.setAttribute("href", url);
  }
  if (external) {
    newLink.setAttribute("target", "_blank");
  }
  return newLink;
}

export function createMessage(message: string, location: string, type: string) {
  clearMessages();
  const messageWrapper = document.getElementById(location) as HTMLElement;
  const messageDiv = document.createElement("div");
  if (type === "check_circle") {
    messageDiv.setAttribute("class", "success message");
    messageDiv.setAttribute("aria-live", "polite");
  } else if (type === "error") {
    messageDiv.setAttribute("class", "error message");
    messageDiv.setAttribute("role", "alert");
    console.error(message);
  } else if (type === "delete" || type === "warn") {
    messageDiv.setAttribute("class", "warn message");
    messageDiv.setAttribute("aria-live", "polite");
    console.warn(message);
  } else {
    messageDiv.setAttribute("class", "info message");
    messageDiv.setAttribute("aria-live", "polite");
  }
  const icon = document.createElement("span");
  icon.setAttribute("class", "material-symbols-outlined");
  const iconName = document.createTextNode(type);
  icon.appendChild(iconName);
  messageDiv.appendChild(icon);
  const messageText = document.createTextNode(message);
  messageDiv.appendChild(messageText);
  const closeButton = createButton("", "button", "closeButton", "", "close");
  closeButton.addEventListener("click", () => (messageWrapper.innerHTML = ""));
  messageDiv.appendChild(closeButton);
  messageWrapper.appendChild(messageDiv);
}

export function createTableHeader(tableHeadings: string[], textAlign: string) {
  const tableHead = tableHeadings.reduce((acc: HTMLElement, currentHeading: string) => {
    const newColumnHeader = makeElement("th", null, textAlign, null);
    const columnHeaderName = document.createTextNode(currentHeading);
    newColumnHeader.appendChild(columnHeaderName);
    acc.appendChild(newColumnHeader);
    return acc;
  }, document.createElement("thead"));
  return tableHead;
}

export function createSimpleTableRow(rowCells: string[], isHTML: boolean) {
  if (isHTML) {
    const tableRow = rowCells.reduce((acc: HTMLElement, currentCell: string) => {
    const newCell = document.createElement("td");
    newCell.innerHTML = currentCell;
    acc.appendChild(newCell);
    return acc;
  }, document.createElement("tr"));
  return tableRow;
  } else {
    const tableRow = rowCells.reduce((acc: HTMLElement, currentCell: string) => {
      const newCell = makeElement("td", null, null, currentCell);
      acc.appendChild(newCell);
      return acc;
    }, document.createElement("tr"));
    return tableRow;
  }
}

export function createSocialLink(platformKey: string, size: number = 24): HTMLAnchorElement | null {
  const data = SOCIAL_DATA[platformKey.toLowerCase()];
  if (!data) return null;

  const link = document.createElement('a');
  link.href = data.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.classList.add('social-link');
  
  // Custom property to tell CSS what the brand color is
  link.style.setProperty('--brand-color', data.brandColor);

  link.innerHTML = `
    <svg viewBox="${data.viewBox}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      ${data.content}
    </svg>
    <span class="social-text">${data.name}</span>
  `;

  return link;
}

export function clearMessages() {
  const messageWrappers = document.getElementsByClassName("message-wrapper");
  for (const messageWrapper of messageWrappers) {
    messageWrapper.innerHTML = "";
  }
}

export function storeMessage(
  message: string,
  messageContainer: string,
  icon: string,
) {
  clearMessages();
  const messageToStore = new Message(message, messageContainer, icon);
  sessionStorage.setItem("message", JSON.stringify(messageToStore));
}

export function fixDate(
  dateString: string | Timestamp,
  dateFormat: string,
): string {
  let dateObj: Date = new Date(0);
  //If Timestamp, convert it to a date object
  if (dateString instanceof Timestamp) {
    dateObj = dateString.toDate();
  }
  //If string, create a new date object
  else if (typeof dateString === "string") {
    dateObj = new Date(dateString);
  }
  //Check if the date object is valid
  if (isNaN(dateObj.getTime())) {
    console.error(
      "fixDate received an invalid date object after parsing:",
      dateString,
    );
    return "Invalid Date";
  }
  //Add timezone to fix date off by one error (with help from stackOverflow thread: https://stackoverflow.com/questions/7556591/is-the-javascript-date-object-always-one-day-off)
  let dateTimezoneFixed: Date = new Date(
    dateObj.getTime() - dateObj.getTimezoneOffset() * -60000,
  );
  //Define formatting options
  const options: Intl.DateTimeFormatOptions =
    dateFormat === "shortDate"
      ? { month: "2-digit", day: "2-digit", year: "numeric" }
      : { month: "long", day: "2-digit", year: "numeric" };
  return dateTimezoneFixed.toLocaleDateString("en-US", options);
}

export function makeElement(elementType: string, elementId: string | null, elementClass: string | null, elementText: string | null) {
  const newElement = document.createElement(elementType);
  if (elementId) newElement.setAttribute('id', elementId);
  if (elementClass) {
    newElement.setAttribute('class', elementClass);
  }
  if (elementText) newElement.textContent = elementText;
  return newElement;
}

export async function markdownToHTML(markdown: string) {
  return marked.parse(markdown);
}

export function markdownCheatSheet() {
  const cheatSheet = makeElement("article", "cheet-sheet", null, null);
      const cheatSheetHeading = makeElement("h2", null, null, "Markdown Cheat Sheet");
      cheatSheet.appendChild(cheatSheetHeading);
      const cheatSheetTable = makeElement("table", "cheat-sheet-table", null, null);
      const tableHeader = createTableHeader(["HTML Element", "Markdown Code"], "left-text");
      cheatSheetTable.appendChild(tableHeader);
      const tableBody = document.createElement("tbody");
      cheatSheetTable.appendChild(tableBody);
      const h1Row = createSimpleTableRow(["<h1>Heading 1</h1>", "# Heading 1"], true);
      tableBody.appendChild(h1Row);
      const h2Row = createSimpleTableRow(["<h2>Heading 2</h2>", "## Heading 2"], true);
      tableBody.appendChild(h2Row);
      const h3Row = createSimpleTableRow(["<h3>Heading 3</h3>", "### Heading 3"], true);
      tableBody.appendChild(h3Row);
      const h4Row = createSimpleTableRow(["<h4>Heading 4</h4>", "#### Heading 4"], true);
      tableBody.appendChild(h4Row);
      const boldRow = createSimpleTableRow(["<b>Bold Text</b>", "**Bold Text**"], true)
      tableBody.appendChild(boldRow);
      const italicRow = createSimpleTableRow(["<i>Italic text</i>", "*Italic text*"], true);
      tableBody.appendChild(italicRow);
      const strikeRow = createSimpleTableRow(["<s>Strikethrough Text</s>", "~~Strikethrough Text~~"], true);
      const hrRow = createSimpleTableRow(["Horizontal Line", "---"], false);
      tableBody.appendChild(strikeRow);
      tableBody.appendChild(hrRow);
      const ulRow = createSimpleTableRow(["<ul><li>Unorder List item</li><li>Unorder List item</li><li>Unorder List item</li></ul>", "* Unorder List item<br>* Unorder List item<br>* Unorder List item"], true);
      tableBody.appendChild(ulRow);
      const olRow = createSimpleTableRow(["<ol><li>Ordered List item 1</li><li>Ordered List item 2</li><li>Ordered List item 3</li></ol>", "1. Ordered List item 1<br>2. Ordered List item 2<br>3. Ordered List item 3"], true);
      tableBody.appendChild(olRow);
      const linkRow = createSimpleTableRow(["<a href='#'>Link</a>", "[Link](url)"], true);
      tableBody.appendChild(linkRow);
      cheatSheet.appendChild(cheatSheetTable);
      const insertTableText = "To insert a table, format as:<br>| Column Header | Column Header | Column Header |<br>|---|---|---|<br>| Cell 1      | cell 2        | cell 3       |<br>| Cell 1      | cell 2        | cell 3       |"
      const insertTable = document.createElement("p");
      insertTable.innerHTML = insertTableText;
      cheatSheet.appendChild(insertTable);
      return cheatSheet;
}