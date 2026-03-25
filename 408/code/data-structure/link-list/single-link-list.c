#include <stdio.h>
#include <stdlib.h>

// 统一风格
// 初始化：返回指针，失败返回 NULL
// 销毁：传入二级指针，置空
// 查询类：不修改链表，用 const，返回状态码
// 修改类：需要修改头指针时用二级指针

// 核心原则：
// - 只读操作用 const LinkList L
// - 需要修改头指针时用 LinkList *L
// - 返回值要么统一用状态码，要么统一用指针（不要混用）

// C 标准库的风格
//   ┌──────────┬─────────────────────────────────┬─────────────────────────┐
//   │ 函数类型  │              示例                │         返回值           │
//   ├──────────┼─────────────────────────────────┼─────────────────────────┤
//   │ 查找类    │ strstr, strchr, memchr, bsearch │ 返回指针，NULL 表示失败   │
//   ├──────────┼─────────────────────────────────┼─────────────────────────┤
//   │ 创建类    │ malloc, fopen, fopen            │ 返回指针，NULL 表示失败 │
//   ├──────────┼─────────────────────────────────┼─────────────────────────┤
//   │ 修改类    │ remove, rename                  │ 返回 int 状态码         │
//   └──────────┴─────────────────────────────────┴─────────────────────────┘

typedef struct LNode
{
  int data;
  struct LNode *next;
} LNode, *LinkList;
// LinkList L        LNode *L;
// 理解为什么传递 LinkList *L

int GetElem(LinkList *L, int i, LNode **e)
{
  if (i == 0)
  {
    *e = *L;
    return 1;
  }
  if (i < 1)
  {
    return 0;
  }
  LinkList p = *L;
  int j = 0;
  while (p != NULL && j < i)
  {
    p = p->next;
    j++;
  }

  if (p == NULL)
  {
    return 0;
  }
  *e = p;
  return 1;
}

LinkList GetPrevNode(LinkList L, int i)
{
  LNode *prev;
  if (GetElem(&L, i - 1, &prev))
  {
    return prev;
  }
  return NULL;
}

int InsertNextNode(LinkList p, int e)
{
  if (p == NULL)
  {
    return 0;
  }
  LNode *node = (LNode *)malloc(sizeof(LNode));
  if (node == NULL)
  { // 内存分配失败
    return 0;
  }

  node->data = e;
  node->next = p->next;
  p->next = node;

  return 1;
}

int InitList(LinkList *L)
{
  *L = (LNode *)malloc(sizeof(LNode));
  if ((*L) == NULL)
  {
    return 0; // 内存不足，分配失败
  }
  (*L)->next = NULL;
  return 1;
};

LinkList InitList2()
{
  LinkList L = (LNode *)malloc(sizeof(LNode));
  if (L == NULL)
  {
    return NULL;
  }
  L->next = NULL;
  return L;
}

int Empty(LinkList L)
{
  if (L->next == NULL)
  {
    return 1;
  }
  return 0;
}

int ListInsert(LinkList *L, int i, int e)
{
  if (i < 1)
  {
    return 0;
  }

  LinkList prevNode = GetPrevNode(*L, i);
  return InsertNextNode(prevNode, e);

  // LNode *p = *L;
  // int j = 0;
  // while (p != NULL && j < i - 1)
  // {
  //   p = p->next;
  //   j++;
  // }
  // if (p == NULL)
  // {
  // return 0;
  // }

  // LNode *ele = (LNode *)malloc(sizeof(LNode));
  // ele->data = e;
  // ele->next = p->next;

  // p->next = ele;

  // return 1;
}

int InsertPriorNode(LinkList p, int e)
{
  int result = InsertNextNode(p, e);
  if (result == 0)
  {
    return 0;
  }
  int current = p->data;
  (p->next)->data = current;
  p->data = e;
  return 1;
}

int ListDelete(LinkList *L, int i, int *e)
{
  if (i < 1)
  {
    return 0;
  }

  LinkList prevNode = GetPrevNode(*L, i);
  if (prevNode == NULL || prevNode->next == NULL)
  {
    return 0;
  }
  LNode *pendingDeleteNode = prevNode->next;
  prevNode->next = pendingDeleteNode->next;
  pendingDeleteNode->next = NULL;
  *e = pendingDeleteNode->data;
  free(pendingDeleteNode);
  return 1;
}

int LocateElem(LinkList L, int e, LNode **node)
{
  if (L == NULL)
  {
    *node = NULL;
    return 0;
  }

  LNode *current = L->next;
  while (current != NULL && current->data != e)
  {
    current = current->next;
  }

  if (current == NULL)
  {
    *node = NULL;
    return 0;
  }

  *node = current;
  return 1;
}

int Length(LinkList L, int *l)
{
  if (L == NULL)
  {
    *l = 0;
    return 0;
  }

  int length = 0;
  LNode *current = L->next;
  while (current != NULL)
  {
    length++;
    current = current->next;
  }

  *l = length;
  return 1;
}

LinkList ListTailCreate()
{
  int i;
  LNode *start = (LNode *)malloc(sizeof(LNode));
  if (start == NULL)
  {
    return NULL;
  }
  LNode *current, *tail;
  current = start;
  scanf("%d", &i);

  while (i != 9999)
  {
    tail = (LNode *)malloc(sizeof(LNode));
    if (tail == NULL)
    {
      // 需要释放所有节点
      free(start);
      return NULL;
    }
    tail->data = i;
    tail->next = NULL;
    current->next = tail;
    current = tail;

    scanf("%d", &i);
  }

  return start;
}

LinkList ListStartList()
{
  int i;
  LNode *start = (LNode *)malloc(sizeof(LNode));
  if(start == NULL) {
    return NULL;
  }
  start->next = NULL;
  LNode *next;
  scanf("%d", &i);

  while (i != 9999)
  {
    next = (LNode *)malloc(sizeof(LNode));
    if (next == NULL) {
      // 释放所有节点
      free(start);
      return NULL;
    }
    next->data = i;
    next->next = start->next;
    start->next = next;

    scanf("%d", &i);
  }

  return start;
}

int main()
{

  return 0;
}
