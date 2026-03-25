#include <stdio.h>
#include <stdlib.h>
// 指针 pointer: 一种数据类型 int *, LNode *, 存放某种变量地址的类型
// 指针变量 pointer variable: 一个变量，里面存的是地址 int *p, p 是指针变量，类型是 int *，存的是地址
// 取地址运算符 &: 获取变量在内存中的地址
// 定义指针 *: 用于声明时，int *p; 这里的 * 表示：“p 是一个指向 int 的指针变量”
// 解引用 *: 用于使用时，*p = 20; 这里的 * 表示：“访问 p 指向的内容”

void base()
{
  int a = 10;  // a 的值是10，地址设为 0x100
  int *p = &a; // p 的值是 0x100，地址设为 0x200
  // a: 表示值 10
  // &a: 表示 a 的地址 0x100
  // p: 是指针变量，类型是 int *，存的是地址 0x100
  // *p: 表示取地址的值，即10

  // 操作
  // 取地址 &: &a 得到变量的地址
  // 指针赋值: po = &a 把地址给指针变量
  // 取值: *po 访问指针指向的内容
  // 通过指针修改值: *p = 20
}

typedef struct LNode
{
  int data;
  struct LNode *next;
} LNode, *LinkList;

void baseStruct()
{
  // 普通结构体变量
  LNode n;
  n.data = 10;

  // 取地址
  LNode *p = &n;

  // 访问方式对比
  printf("%d", n.data);    // 变量访问值
  printf("%d", (*p).data); // 指针访问值 
  printf("%d", p->data);   // 指针访问值 p->data == (*p).data
}

void createStruct()
{
  // 创建节点
  LNode *p = (LNode *)malloc(sizeof(LNode)); // p 指针变量
  p->data = 10;
  (*p).data = 20;
  p->next = NULL;
}

int main()
{
  // 一级指针 & 二级指针
  // 一级指针: LNode *p 存“节点地址”
  // 二级指针: LNode **pp 存“指针变量的地址”

  LNode *p = NULL; // p 的值是 NULL，地址设为 0x300
  LNode **pp = &p; // pp 的值是 0x300，地址设为 0x400

  // p: 是指针变量，类型是 LNode *（一级指针），存的是地址 0x300
  // *p: 表示一个 LNode 节点
  // pp: 是指针变量，类型是LNode **（二级指针）, 存的是地址 0x400
  // *pp: 表示取地址 0x400 对应的值 0x300，即指针变量 p，类型是 LNode *
  // **pp: 表示取地址 0x300 对应的值，即一个 LNode 节点
  // 想改指针 → 传二级指针

  return 1;
}