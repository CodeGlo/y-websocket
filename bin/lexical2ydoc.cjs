const Y = require('yjs');
const { $getRoot, $isElementNode, $isTextNode, $isDecoratorNode, $getSelection ,LexicalEditor, LexicalNode } = require('lexical');
const { createHeadlessEditor } = require('@lexical/headless');
const { $generateNodesFromDOM, $generateHtmlFromNodes } = require('@lexical/html');
const { JSDOM } = require('jsdom')
const {syncLexicalUpdateToYjs} = require('@lexical/yjs')


// /**
//  * 
//  * @param {*} lexicalNode 
//  * @returns 
//  */
// function getLexicalNodeAttributes(lexicalNode) {
//   const attributes = {};
//   if ($isElementNode(lexicalNode)) {
//     const keys = lexicalNode.getKeys();
//     for (const key of keys) {
//       if (key !== 'type' && key !== 'key') {
//         attributes[      }
//     }
//   }
//   return attributes;
// }

/**
 *
 * @param {LexicalEditor} lexicalEditor
 */
function convertLexicalToYjs(lexicalEditor) {
  // Create a new Yjs document
  const ydoc = new Y.Doc();

  // Create a root element in the Yjs document to hold the content
  const yroot = ydoc.getXmlFragment('root');

  /**
   * Recursive function to convert Lexical nodes to Yjs nodes
   * this is a function written by looking at the lexical / yjs code
   * @param {LexicalNode} lexicalNode 
   * @param {Y.XmlElement} yparent 
   */
  function convertNodes(lexicalNode, yparent) {
    if ($isElementNode(lexicalNode)) {
      const yelementName = lexicalNode.getType();
      const yelement = new Y.XmlElement(yelementName);
      
      // Set attributes from lexical...
      // checking what kind of attributes are available from lexical...
      console.log(lexicalNode.getKey())
      console.log(lexicalNode.getFormat())
      console.log(lexicalNode.getFormatType())
      console.log(lexicalNode.getTextContent())
      console.log(lexicalNode.getType())

      yparent.insert(yparent.length, [yelement]);

      // Recursively convert children nodes
      lexicalNode.getChildren().forEach((childNode) => {
        convertNodes(childNode, yelement);
      });
    } else if ($isTextNode(lexicalNode)) {
      const ytext = new Y.Text();
      ytext.insert(0, lexicalNode.getTextContent());
      yparent.insert(yparent.length, [ytext]);
    } else if ($isDecoratorNode(lexicalNode)) {
      const ydecorator = new Y.XmlElement(lexicalNode.getType());

      // Set attributes from lexical...

      yparent.insert(yparent.length, [ydecorator]);
    }
  }

  // Get the root node of the Lexical document
  const lexicalRoot = $getRoot();

  // Convert the Lexical nodes to Yjs nodes
  convertNodes(lexicalRoot, yroot);

  return ydoc;
}

module.exports = { convertLexicalToYjs, htmlToLexical };

/**
 * 
 * @param {string} htmlString 
 * @returns {Promise<LexicalEditor>}
 */
function htmlToLexical(htmlString) {
  // Once you've generated LexicalNodes from your HTML you can now initialize an editor instance with the parsed nodes.
  // const editorNodes = [] // Any custom nodes you register on the editor
  const dom = new JSDOM(htmlString)

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  const editor = createHeadlessEditor();
  let selection
  // console.log(editor)
  // console.log('/////////////')
  return new Promise((resolve, reject) => {

    editor.update(() => {
      // In a headless environment you can use a package such as JSDom to parse the HTML string.

      // Once you have the DOM instance it's easy to generate LexicalNodes.
    const nodes = $generateNodesFromDOM(editor, dom.window.document);
    
    // Select the root
    $getRoot().select();
    
    // Insert them at a selection.
    selection = $getSelection();
    selection?.insertNodes(nodes);
  }, {
    discrete: true, 
    onUpdate: () => {
      resolve(editor)
      // ? uncomment to check the html deserialization from lexical
    //   const editorState = editor.getEditorState();
    //   editorState.read(() => {
      //     const htmlString = $generateHtmlFromNodes(editor, null);
    //     console.log(htmlString);
    //   });
    }
  })
})
}