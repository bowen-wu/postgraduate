#include <stdio.h>

// C 标准库的风格
//   ┌──────────┬─────────────────────────────────┬─────────────────────────┐
//   │ 函数类型  │              示例                │         返回值          │
//   ├──────────┼─────────────────────────────────┼─────────────────────────┤
//   │ 查找类    │ strstr, strchr, memchr, bsearch │ 返回指针，NULL 表示失败 │
//   ├──────────┼─────────────────────────────────┼─────────────────────────┤
//   │ 创建类    │ malloc, fopen, fopen            │ 返回指针，NULL 表示失败 │
//   ├──────────┼─────────────────────────────────┼─────────────────────────┤
//   │ 修改类    │ remove, rename                  │ 返回 int 状态码         │
//   └──────────┴─────────────────────────────────┴─────────────────────────┘
//   只读操作: 传指针，加 const
// 
// 取地址：&a
// 指针赋值：p = &a
// 指针变量取值：*p
// 通过指针修改值：*p = 20

#define MaxSize 10
typedef struct
{
  int data[MaxSize];
  int top
} SqStack;

SqStack InitStack()
{
  SqStack stack;
  stack.top = -1;
  return stack;
}

int StackEmpty(const SqStack *stack)
{
  if (stack->top == -1) {
    return 1;
  }
  return 0;
}

int DestroyStack(SqStack *stack)
{
  stack->top = -1;
  return 1;
}

int Push(SqStack *stack, int ele)
{
  // 注意边界条件
  if (stack->top == MaxSize - 1) {
    return 0;
  }
  stack->top += 1;
  stack->data[stack->top] = ele;
  return 1;
}

int Pop(SqStack *stack, int *ele) 
{
  if (StackEmpty(stack)) {
    return 0;
  }

  *ele = stack->data[stack->top];
  stack->top -= 1;
  return 1;
}

int GetTop(const SqStack *stack, int *ele)
{
  if (StackEmpty(stack)) {
    return 0;
  }

  *ele = stack->data[stack->top];
  return 1;
}


int main()
{
  SqStack stack = InitStack();
  return 1;
}