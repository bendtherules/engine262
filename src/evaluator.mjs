import {
  NormalCompletion,
  UpdateEmpty,
  Q, X,
  ReturnIfAbrupt,
} from './completion.mjs';
import {
  surroundingAgent,
  ResolveBinding,
} from './engine.mjs';
import {
  isExpression,
  isStatement,
  isExpressionStatement,
  isThrowStatement,
  isTryStatement,
  isBlockStatement,
  isNewExpression,
  isMemberExpressionWithBrackets,
  isMemberExpressionWithDot,
  isCallExpressionWithBrackets,
  isCallExpressionWithDot,
  isActualAdditiveExpression,
  isAdditiveExpressionWithPlus,
  isAdditiveExpressionWithMinus,
  isIdentifierReference,
  isCallExpression,
  isPrimaryExpressionWithThis,
  isFunctionDeclaration,
  isGeneratorDeclaration,
  isAsyncFunctionDeclaration,
  isAsyncGeneratorDeclaration,
  isLexicalDeclaration,
  isLexicalBinding,
  isAssignmentExpression,
} from './ast.mjs';
import {
  BoundNames_Declaration,
  LexicallyScopedDeclarations_StatementList,
  IsConstantDeclaration,
} from './static-semantics/all.mjs';
import {
  Evaluate_AssignmentExpression,
  Evaluate_TryStatement,
  Evaluate_CallExpression,
  Evaluate_ThrowStatement,
  Evaluate_ThisExpression,
  Evaluate_NewExpression,
  Evaluate_LexicalDeclaration,
  Evaluate_LexicalBinding,
  InstantiateFunctionObject,
} from './runtime-semantics/all.mjs';
import {
  Type,
  Reference,
  New as NewValue,
} from './value.mjs';
import {
  Assert,
  ToPropertyKey,
  RequireObjectCoercible,
  ToPrimitive,
  ToString,
  ToNumber,
  GetValue,
} from './abstract-ops/all.mjs';
import {
  NewDeclarativeEnvironment,
  DeclarativeEnvironmentRecord,
} from './environment.mjs';

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression [ Expression ]
//   CallExpression : CallExpression [ Expression ]
function MemberExpression_Expression(MemberExpression, Expression) {
  const baseReference = Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const propertyNameReference = Evaluate(Expression);
  const propertyNameValue = Q(GetValue(propertyNameReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyKey = ToPropertyKey(propertyNameValue);
  const strict = surroundingAgent.isStrictCode;
  return new Reference(bv, propertyKey, NewValue(strict));
}

// #sec-property-accessors-runtime-semantics-evaluation
//   MemberExpression : MemberExpression . IdentifierName
//   CallExpression : CallExpression . CallExpression
function MemberExpression_IdentifierName(MemberExpression, IdentifierName) {
  const baseReference = Evaluate(MemberExpression);
  const baseValue = Q(GetValue(baseReference));
  const bv = Q(RequireObjectCoercible(baseValue));
  const propertyNameString = NewValue(IdentifierName.name);
  const strict = true;
  return new Reference(bv, propertyNameString, NewValue(strict));
}

// #prod-AdditiveExpression
//    AdditiveExpression : AdditiveExpression + MultiplicativeExpression
function AdditiveExpression_MultiplicativeExpression(AdditiveExpression, MultiplicativeExpression) {
  const lref = Evaluate(AdditiveExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  const lprim = Q(ToPrimitive(lval));
  const rprim = Q(ToPrimitive(rval));
  if (Type(lprim) === 'String' || Type(rprim) === 'String') {
    const lstr = Q(ToString(lprim));
    const rstr = Q(ToString(rprim));
    return NewValue(lstr.stringValue() + rstr.stringValue());
  }
  const lnum = Q(ToNumber(lprim));
  const rnum = Q(ToNumber(rprim));
  return NewValue(lnum.numberValue() + rnum.numberValue());
}

function SubtractiveExpression_MultiplicativeExpression(
  SubtractiveExpression, MultiplicativeExpression,
) {
  const lref = Evaluate(SubtractiveExpression);
  const lval = Q(GetValue(lref));
  const rref = Evaluate(MultiplicativeExpression);
  const rval = Q(GetValue(rref));
  const lnum = Q(ToNumber(lval));
  const rnum = Q(ToNumber(rval));
  return NewValue(lnum.numberValue() - rnum.numberValue());
}

function Evaluate_AdditiveExpression(AdditiveExpression) {
  switch (true) {
    case isAdditiveExpressionWithPlus(AdditiveExpression):
      return AdditiveExpression_MultiplicativeExpression(
        AdditiveExpression.left, AdditiveExpression.right,
      );
    case isAdditiveExpressionWithMinus(AdditiveExpression):
      return SubtractiveExpression_MultiplicativeExpression(
        AdditiveExpression.left, AdditiveExpression.right,
      );

    default:
      throw new RangeError('Unknown AdditiveExpression type');
  }
}

function EvaluateExpression_Identifier(Identifier) {
  return Q(ResolveBinding(NewValue(Identifier.name)));
}

// #sec-function-definitions-runtime-semantics-evaluation<Paste>
// FunctionDeclaration :
//   function BindingIdentifier ( FormalParameters ) { FunctionBody }
//   function ( FormalParameters ) { FunctionBody }
function Evaluate_FunctionDeclaration() {
  return new NormalCompletion(undefined);
}

// #sec-block-runtime-semantics-evaluation
// Block :
//   { }
//   { StatementList }
function Evaluate_BlockStatement(BlockStatement) {
  const StatementList = BlockStatement.body;

  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const oldEnv = surroundingAgent.runningExecutionContext.LexicalEnvironment;
  const blockEnv = NewDeclarativeEnvironment(oldEnv);
  BlockDeclarationInstantiation(StatementList, blockEnv);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = blockEnv;
  const blockValue = Evaluate(StatementList);
  surroundingAgent.runningExecutionContext.LexicalEnvironment = oldEnv;
  return blockValue;
}

// #sec-blockdeclarationinstantiation
function BlockDeclarationInstantiation(code, env) {
  const envRec = env.EnvironmentRecord;
  Assert(envRec instanceof DeclarativeEnvironmentRecord);
  const declarations = LexicallyScopedDeclarations_StatementList(code);
  for (const d of declarations) {
    for (const dn of BoundNames_Declaration(d)) {
      if (IsConstantDeclaration(d)) {
        X(envRec.CreateImmutableBinding(dn, NewValue(true)));
      } else {
        X(envRec.CreateMutableBinding(dn, NewValue(false)));
      }
      if (isFunctionDeclaration(d) || isGeneratorDeclaration(d)
          || isAsyncFunctionDeclaration(d) || isAsyncGeneratorDeclaration(d)) {
        const fn = BoundNames_Declaration(d)[0];
        const fo = InstantiateFunctionObject(d, env);
        envRec.InitializeBinding(fn, fo);
      }
    }
  }
}

// #sec-block-runtime-semantics-evaluation
//   StatementList : StatementList StatementListItem
//
// (implicit)
//   StatementList : StatementListItem
function EvaluateStatementList(StatementList) {
  if (StatementList.length === 0) {
    return new NormalCompletion(undefined);
  }

  const StatementListItem = StatementList.shift();

  let sl = EvaluateStatementListItem(StatementListItem);
  ReturnIfAbrupt(sl);
  const s = Evaluate(StatementList);
  return UpdateEmpty(s, sl);
}

// (implicit)
//   StatementListItem : Statement
//   Statement : ExpressionStatement
function EvaluateStatementListItem(StatementListItem) {
  surroundingAgent.nodeStack.push(StatementListItem);
  try {
    switch (true) {
      case isBlockStatement(StatementListItem):
        return Evaluate_BlockStatement(StatementListItem);
      case isExpressionStatement(StatementListItem):
        return Evaluate_ExpressionStatement(StatementListItem);
      case isThrowStatement(StatementListItem):
        return Evaluate_ThrowStatement(StatementListItem.argument);
      case isTryStatement(StatementListItem):
        return Evaluate_TryStatement(StatementListItem);
      case isFunctionDeclaration(StatementListItem):
        return Evaluate_FunctionDeclaration(StatementListItem);
      case isLexicalDeclaration(StatementListItem):
        return Evaluate_LexicalDeclaration(StatementListItem);
      case isLexicalBinding(StatementListItem):
        return Evaluate_LexicalBinding(StatementListItem);

      default:
        console.error(StatementListItem); // eslint-disable-line no-console
        throw new RangeError('unknown StatementListItem type');
    }
  } finally {
    surroundingAgent.nodeStack.pop();
  }
}

function EvaluateStatement(...args) {
  return EvaluateStatementListItem(...args);
}

// #sec-expression-statement-runtime-semantics-evaluation
//   ExpressionStatement : Expression `;`
function Evaluate_ExpressionStatement(ExpressionStatement) {
  const exprRef = EvaluateExpression(ExpressionStatement.expression);
  return GetValue(exprRef);
}

// (implicit)
//   Expression : NullLiteral
//   Expression : BooleanLiteral
//   Expression : NumbericLiteral
//   Expression : StringLiteral
function EvaluateExpression(Expression) {
  surroundingAgent.nodeStack.push(Expression);
  try {
    if (Expression.type === 'Literal'
        && (
          Expression.value === null
          || typeof Expression.value === 'boolean'
          || typeof Expression.value === 'number'
          || typeof Expression.value === 'string')) {
      return NewValue(Expression.value);
    }

    switch (true) {
      case isIdentifierReference(Expression):
        return EvaluateExpression_Identifier(Expression);
      case isMemberExpressionWithBrackets(Expression):
      case isCallExpressionWithBrackets(Expression): // identical semantics
        return MemberExpression_Expression(Expression.object, Expression.property);
      case isMemberExpressionWithDot(Expression):
      case isCallExpressionWithDot(Expression): // identical semantics
        return MemberExpression_IdentifierName(Expression.object, Expression.property);
      case isActualAdditiveExpression(Expression):
        return Evaluate_AdditiveExpression(Expression);
      case isCallExpression(Expression):
        return Evaluate_CallExpression(Expression);
      case isPrimaryExpressionWithThis(Expression):
        return Evaluate_ThisExpression(Expression);
      case isNewExpression(Expression):
        return Evaluate_NewExpression(Expression);
      case isAssignmentExpression(Expression):
        return Evaluate_AssignmentExpression(Expression);

      default:
        console.error(Expression); // eslint-disable-line no-console
        throw new RangeError('EvaluateExpression unknown expression type');
    }
  } finally {
    surroundingAgent.nodeStack.pop();
  }
}

export function Evaluate(node) {
  if (Array.isArray(node)) {
    return EvaluateStatementList(node);
  }

  if (isExpression(node)) {
    return EvaluateExpression(node);
  }

  if (isStatement(node)) {
    return EvaluateStatement(node);
  }
  console.error(node); // eslint-disable-line no-console
  throw new RangeError('unknown node type');
}

// #sec-script-semantics-runtime-semantics-evaluation
//   Script : [empty]
//
// (implicit)
//   Script : ScriptBody
//   ScriptBody : StatementList
export function EvaluateScript(Script, envRec) {
  if (Script.length === 0) {
    return new NormalCompletion();
  }
  return EvaluateStatementList(Script, envRec);
}
