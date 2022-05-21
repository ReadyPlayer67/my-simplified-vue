export function generate(ast) {
    let code = 'return '
    const functionName = 'render'
    const args = ['_ctx','_cache']
    const signature = args.join(', ')
    code += `function ${functionName} (${signature}) {`
    const node = ast.children[0]
    code += `return '${node.content}'}`
    return code
}
