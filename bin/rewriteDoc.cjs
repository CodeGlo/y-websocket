const { $generateNodesFromDOM } = require('@lexical/html');
const { createHeadlessEditor } = require('@lexical/headless');
const {
    createBinding,
    syncLexicalUpdateToYjs,
    syncYjsChangesToLexical,
} = require('@lexical/yjs');
const { $getRoot, $getSelection } = require('lexical')
const { Transaction } = require('yjs');
const { JSDOM } = require('jsdom')
const {
    ListNode, ListItemNode
} = require('@lexical/list');
const {
    QuoteNode, HeadingNode
} = require('@lexical/rich-text');

/**
 * @typedef {import('@lexical/yjs').Binding} Binding
 * @typedef {import('@lexical/yjs').Provider} Provider
 * @typedef {import('lexical').LexicalNode} LexicalNode
 * @typedef {import('lexical').Klass<LexicalNode>} Klass
 * @typedef {import('lexical').LexicalEditor} LexicalEditor
 * @typedef {import('lexical').LexicalNodeReplacement} LexicalNodeReplacement
 * @typedef {import('lexical').SerializedEditorState} SerializedEditorState
 * @typedef {import('lexical').SerializedLexicalNode} SerializedLexicalNode
 * @typedef {import('yjs').YEvent} YEvent
 * 
 */

/**
 * Creates headless collaboration editor with no-op provider (since it won't
 * connect to message distribution infra) and binding. It also sets up
 * bi-directional synchronization between yDoc and editor
 * @template T
 * @param {string} docName
 * @param {string} htmlString
 * @param {any} doc
 * @param {(editor: LexicalEditor, binding: Binding, provider: Provider) => T} callback 
 * @returns {T}
*/
// * @param {ReadonlyArray<Klass | LexicalNodeReplacement>} nodes 
function rewriteDoc(
    docName,
    htmlString,
    doc,
    callback,
) {
    const dom = new JSDOM(htmlString)

    global.window = dom.window;
    global.document = dom.window.document;
    global.navigator = dom.window.navigator;
    const editor = createHeadlessEditor({nodes: [ListNode, ListItemNode, QuoteNode, HeadingNode]});
    const id = docName;
    const docMap = new Map([[id, doc]]);
    const provider = createNoOpProvider();
    const binding = createBinding(editor, provider, id, doc, docMap);

    const unsubscribe = registerCollaborationListeners(editor, provider, binding);
    editor.update(() => {
        const newNodes = $generateNodesFromDOM(editor, dom.window.document);
        $getRoot().select();
        const selection = $getSelection();
        selection?.insertNodes(newNodes);
    }, { discrete: true })

    const res = callback(editor, binding, provider);
    unsubscribe();
    return res
}


/**
 * 
 * @param {LexicalEditor} editor 
 * @param {Provider} provider 
 * @param {Binding} binding 
 * @returns {() => void}
*/
function registerCollaborationListeners(
    editor,
    provider,
    binding,
) {
    const unsubscribeUpdateListener = editor.registerUpdateListener(
        ({
            dirtyElements,
            dirtyLeaves,
            editorState,
            normalizedNodes,
            prevEditorState,
            tags,
        }) => {
            if (tags.has('skip-collab') === false) {
                syncLexicalUpdateToYjs(
                    binding,
                    provider,
                    prevEditorState,
                    editorState,
                    dirtyElements,
                    dirtyLeaves,
                    normalizedNodes,
                    tags,
                );
            }
        },
    );

    /**
     * 
     * @param {Array<YEvent>} events 
     * @param {Transaction} transaction 
    */
    const observer = (events, transaction) => {
        if (transaction.origin !== binding) {
            syncYjsChangesToLexical(binding, provider, events, false);
        }
    };

    binding.root.getSharedType().observeDeep(observer);

    return () => {
        unsubscribeUpdateListener();
        binding.root.getSharedType().unobserveDeep(observer);
    };
}

/**
 * 
 * @returns {Provider}
*/
function createNoOpProvider() {
    const emptyFunction = () => { };

    return {
        awareness: {
            getLocalState: () => null,
            getStates: () => new Map(),
            off: emptyFunction,
            on: emptyFunction,
            setLocalState: emptyFunction,
        },
        connect: emptyFunction,
        disconnect: emptyFunction,
        off: emptyFunction,
        on: emptyFunction,
    };
}


module.exports = { rewriteDoc };