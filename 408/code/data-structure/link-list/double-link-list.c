#include <stdio.h>

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

typedef struct DNode {
  int data;
  DNode *prior;
  DNode *next;
}DNode, *DLinkList;


DLinkList InitDLinkList() {
  DLinkList node = (DNode *)malloc(sizeof(DNode));
  if (node == NULL) {
    return NULL;
  }

  node->prior = NULL;
  node->next = NULL;
  return node;
}

int empty(DLinkList linkList) {
  if (linkList == NULL || linkList->next == NULL) {
    return 1;
  }
  return 0;
}

int InsertNextDNode(DNode *p, DNode *s) {

}

int DeleteNextDNode(DNode *p) {

}

int DestoryList(DLinkList *start) {

}

int main() {
  return 1;
}