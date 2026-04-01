#include <stdio.h>
#include <sequence-stack.c>

// https://leetcode.cn/problems/valid-parentheses/

int isValid(char str[])
{

  SqStack *stack = InitStack();
  for (int i = 0; str[i] != '\0'; i++)
  {
    if (str[i] == '(' || str[i] == '{' || str[i] == '[')
    {
      Push(stack, str[i]);
    }
    else if (str[i] == ')' || str[i] == '}' || str[i] == ']')
    {
      char *ch;

      // 要先检查是否栈空
      if (StackEmpty(stack))
      {
        return 0;
      }

      Pop(stack, &ch);
      if ((str[i] == ')' && *ch != '(') || (str[i] == '}' && *ch != '{') || (str[i] == ']' && *ch != '['))
      {
        return 0;
      }
    }
    else
    {
      return 0;
    }
  }

  return StackEmpty(stack);
}

int main()
{
  return 1;
}