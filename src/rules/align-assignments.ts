import { AST_NODE_TYPES, ESLintUtils, TSESTree } from '@typescript-eslint/experimental-utils'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require('../package.json').version

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/0x706b/eslint-plugin-align-assignments/blob/v${version}/docs/rules/${name}.md`
)

const spaceMatcher = /(\s*)((?!\['|"|`)(?!=>)(?:\+|-|\*|\/|%|&|&&|\^|\||\|\||<<|>>|\*\*|>>>)?=)(?!'|"|`\])/

type AssignmentExpressionStatement = TSESTree.ExpressionStatement & { expression: TSESTree.AssignmentExpression }
type ExportNamedVariableDeclaration = TSESTree.ExportNamedDeclaration & { declaration: TSESTree.VariableDeclaration }

type CheckedNodes =
  | TSESTree.VariableDeclaration
  | AssignmentExpressionStatement
  | ExportNamedVariableDeclaration
  | TSESTree.ClassProperty
  | TSESTree.AssignmentExpression

export default createRule({
  name: 'align-assignments',
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce assignment alignment',
      category: 'Stylistic Issues',
      recommended: false
    },
    fixable: 'code',
    messages: {
      notAligned: 'This group of assignments is not aligned'
    },
    schema: [
      {
        type: 'object',
        properties: {
          maxColumns: {
            type: 'number'
          },
          maxRows: {
            type: 'number'
          }
        }
      }
    ]
  },
  defaultOptions: [
    {
      maxRows: 1,
      maxColumns: 20
    }
  ] as const,
  create(context, optionsWithDefaults) {
    const { maxRows, maxColumns }  = optionsWithDefaults[0]
    const sourceCode               = context.getSourceCode()
    const groups: CheckedNodes[][] = []
    let previousNode: CheckedNodes

    return {
      VariableDeclaration(node) {
        if (
          previousNode &&
          previousNode?.type === 'ExportNamedDeclaration' &&
          node.parent?.type === 'ExportNamedDeclaration'
        ) {
          return
        }

        addNode(node, node)
      },
      ExpressionStatement(node) {
        if (node.expression.type !== AST_NODE_TYPES.AssignmentExpression) {
          return
        }

        addNode(node as AssignmentExpressionStatement, node.expression)
      },
      ExportNamedDeclaration(node) {
        if (node.declaration?.type !== AST_NODE_TYPES.VariableDeclaration) {
          return
        }

        addNode(node as ExportNamedVariableDeclaration, node.declaration)
      },
      ClassProperty(node) {
        if (node.value == null) {
          return
        }
        addNode(node, node)
      },
      'Program:exit': checkAll
    }

    function checkAll() {
      groups.forEach(check)
    }

    function isAssignmentExpression(node: TSESTree.Node): node is TSESTree.AssignmentExpression {
      return node.type === AST_NODE_TYPES.AssignmentExpression
    }

    function isExportNamedDeclaration(node: TSESTree.Node): node is TSESTree.ExportNamedDeclaration {
      return node.type === AST_NODE_TYPES.ExportNamedDeclaration
    }

    function isExpressionStatement(node: TSESTree.Node): node is TSESTree.ExpressionStatement {
      return node.type === AST_NODE_TYPES.ExpressionStatement
    }

    function isVariableDeclaration(node: TSESTree.Node): node is TSESTree.VariableDeclaration {
      return node.type === AST_NODE_TYPES.VariableDeclaration
    }

    function addNode(groupNode: CheckedNodes, node: CheckedNodes) {
      if (shouldStartNewGroup(groupNode)) {
        groups.push([node])
      } else {
        getLast(groups).push(node)
      }

      previousNode = groupNode
    }

    function shouldStartNewGroup(node: CheckedNodes) {
      if (!previousNode) {
        return true
      }
      if (node.parent !== previousNode.parent) {
        return true
      }
      if (
        previousNode.parent?.type === 'ForStatement' &&
        previousNode.type === AST_NODE_TYPES.VariableDeclaration &&
        previousNode.declarations
      ) {
        return true
      }
      const lastAssignmentNode = getLast(getLast(groups))
      if (lastAssignmentNode != null) {
        if (node.loc.start.line - lastAssignmentNode.loc.start.line > maxRows) {
          return true
        }
        if (Math.abs(findAssignment(lastAssignmentNode)! - findAssignment(node)!) > maxColumns) {
          return true
        }
      }
      const lineOfNode = sourceCode.getFirstToken(node)?.loc.start.line
      const lineOfPrev = sourceCode.getLastToken(previousNode)?.loc.start.line
      return lineOfNode != null && lineOfPrev != null ? lineOfNode - lineOfPrev !== 1 : true
    }

    function check(group: CheckedNodes[]) {
      const maxPos = getMaxPos(group)
      if (maxPos && !areAligned(maxPos, group)) {
        context.report({
          loc: {
            start: group[0].loc.start,
            end: getLast(group).loc.end
          },
          messageId: 'notAligned',
          fix: (fixer) => {
            const fixings = group.map((node) => {
              const tokens          = sourceCode.getTokens(node)
              const firstToken      = tokens[0]
              const assignmentToken = tokens.find((token) =>
                ['=', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=', '>>=', '<<=', '**=', '>>>=', '||=', '&&='].includes(token.value)
              )
              const line          = sourceCode.getText(node)
              const lineIsAligned = line.charAt(maxPos) === '='
              if (lineIsAligned || !assignmentToken || isMultiline(firstToken, assignmentToken)) {
                return fixer.replaceText(node, line)
              } else {
                const spacePrefix    = firstToken.loc.start.column
                const startDelimiter = assignmentToken.loc.start.column - spacePrefix
                const endDelimiter   = assignmentToken.loc.end.column - spacePrefix
                const start          = line.slice(0, startDelimiter).replace(/\s+$/m, '')
                const ending         = line.slice(endDelimiter).replace(/^\s+/m, '')
                const spacesRequired = maxPos - start.length - assignmentToken.value.length + 1
                const spaces         = ' '.repeat(spacesRequired)
                const fixedText      = `${start}${spaces}${assignmentToken.value} ${ending}`
                return fixer.replaceText(node, fixedText)
              }
            })

            return fixings.filter((fix) => fix)
          }
        })
      }
    }

    function isMultiline(firstToken: TSESTree.Token, assignmentToken: TSESTree.Token) {
      return firstToken.loc.start.line !== assignmentToken.loc.start.line
    }

    function findAssignment(node: CheckedNodes) {
      const prefix   = getPrefix(node)
      const source   = sourceCode.getText(node)
      const match    = source.substr(prefix).match(spaceMatcher)
      const position = match && match.index != null ? match.index + prefix + match[2].length : null
      return position
    }

    function getPrefix(node: CheckedNodes) {
      let nodeBefore: TSESTree.Node
      if (isAssignmentExpression(node)) {
        nodeBefore = node.left
      } else if (isVariableDeclaration(node)) {
        nodeBefore = node.declarations[0].id
      } else if (isExpressionStatement(node)) {
        nodeBefore = node.expression.left
      } else if (isExportNamedDeclaration(node)) {
        nodeBefore = node.declaration.declarations[0].id
      } else {
        nodeBefore = node.key
      }

      const prefix = nodeBefore.loc.end.column - nodeBefore.loc.start.column
      return prefix
    }

    function areAligned(maxPos: number, nodes: CheckedNodes[]) {
      return nodes
        .filter(assignmentOnFirstLine)
        .map((node) => sourceCode.getText(node))
        .every((source) => source.charAt(maxPos) === '=')
    }

    function getMaxPos(nodes: CheckedNodes[]) {
      const maxPos = nodes
        .filter(assignmentOnFirstLine)
        .map(findAssignment)
        .reduce((last, current) => Math.max(last!, current!), 0)
      return maxPos
    }

    function assignmentOnFirstLine(node: CheckedNodes) {
      if (isAssignmentExpression(node)) {
        const onFirstLine = node.left.loc.start.line === node.right.loc.start.line
        return onFirstLine
      } else {
        const source = sourceCode.getText(node)
        const lines  = source.split('\n')
        return lines[0].includes('=')
      }
    }

    function getLast<A>(ary: A[]): A {
      return ary[ary.length - 1]
    }
  }
})
