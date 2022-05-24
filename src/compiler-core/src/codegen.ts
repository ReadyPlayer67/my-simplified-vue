import {NodeTypes} from "./ast";
import {CREATE_ELEMENT_VNODE, helperNameMap, TO_DISPLAY_STRING} from "./runtimeHelpers";

export function generate(ast) {
    const context = createCodegenContext()
    const {push} = context
    genFunctionPreamble(ast, context)
    const functionName = 'render'
    const args = ['_ctx', '_cache']
    const signature = args.join(', ')
    push(`function ${functionName} (${signature}) {`)
    push('return ')
    genNode(ast.codegenNode, context)
    push('}')
    return {
        code: context.code
    }
}

function createCodegenContext() {
    const context = {
        code: '',
        push(source) {
            context.code += source
        },
        helper(key) {
            return `_${helperNameMap[key]}`
        }
    }
    return context
}

//处理前导码（import，const）这些
function genFunctionPreamble(ast, context) {
    const {push} = context
    const VueBinging = 'Vue'
    const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(helper => aliasHelper(helper)).join(', ')} } = "${VueBinging}"`)
    }
    push('\n')
    push('return ')
}

function genNode(node, context) {
    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break;
        case NodeTypes.TEXT:
            genText(node, context);
            break;
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break;
        case NodeTypes.ELEMENT:
            genElement(node, context)
            break;
        default:
            break;
    }

}

function genText(node, context) {
    const {push} = context
    push(`'${node.content}'`)
}

function genInterpolation(node, context) {
    const {push, helper} = context
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(')')
}

function genExpression(node, context) {
    const {push} = context
    push(`${node.content}`)
}

function genElement(node, context) {
    const {push, helper} = context
    const {tag} = node
    push(`${helper(CREATE_ELEMENT_VNODE)}(`)
    push(`"${tag}")`)
}