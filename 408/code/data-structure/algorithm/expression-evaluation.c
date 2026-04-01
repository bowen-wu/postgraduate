#include <sequence-stack.c>
#include <stdio.h>

// 逆波兰表达式求值:
// https://leetcode.cn/problems/evaluate-reverse-polish-notation/description/

int Evaluation(int left, int right, char operate) {
  if (operate == '+') {
    return left + right;
  }

  if (operate == '-') {
    return left - right;
  }

  if (operate == '*') {
    return left * right;
  }

  if (operate == '/') {
    return left / right;
  }
}

int IsBrackets(char ch) { return ch == '(' || ch == ')'; }

int IsOperate(char ch) {
  return ch == '+' || ch == '-' || ch == '*' || ch == '/';
}

// a >= b => 1
// a < b => 0
int compareOperatePriority(char a, char b) {
  if (a == '*' || a == '/') {
    return 1;
  }
  if ((a == '+' || a == '-') && (b != '*' && b != '/')) {
    return 1;
  }
  return 0;
}

int evalRPN(char tokens[], int *result) {
  SqStack *stack = InitStack();

  for (int i = 0; tokens[i] != '\0'; i++) {
    char ch = tokens[i];
    if (IsOperate(ch)) {
      int right, left;
      if (!Pop(stack, &right)) {
        return 0;
      }
      if (!Pop(stack, &left)) {
        return 0;
      }

      Push(stack, Evaluation(left, right, ch));
    } else {
      Push(stack, ch - '0');
    }
  }

  if (!Pop(stack, result)) {
    return 0;
  }

  if (StackEmpty(stack)) {
    return 1;
  }

  return 0;
}

int convert(char tokens[], char *result) {
  SqStack *stack = InitStack();

  for (int i = 0; tokens[i] != '\0'; i++) {
    char ch = tokens[i];
    if (IsBrackets(ch)) {
      if (ch == ')') {
        while (!StackEmpty(stack) && GetTop(stack) != '(') {
          char temp;
          Pop(stack, &temp);
          *result += temp;
        }
        char temp;
        Pop(stack, &temp);
      } else {
        Push(stack, ch);
      }
    } else if (IsOperate(ch)) {
      while (!StackEmpty(stack) && compareOperatePriority(GetTop(stack), ch)) {
        char temp;
        Pop(stack, &temp);
        *result += temp;
      }

      Push(stack, ch);
    } else {
      *result += ch;
    }
  }

  while (!StackEmpty(stack)) {
    char temp;
    Pop(stack, &temp);
    *result += temp;
  }
  result += '\0';

  return 1;
}

int main() {}
