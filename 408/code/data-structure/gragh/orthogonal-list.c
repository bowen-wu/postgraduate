#include <stdio.h>
#include <stdlib.h>

// 有向图：十字链表
// <A, B>, <A, C>, <C, A>, <C, D>, <D, B>, <D, A>, <D, C>

typedef struct ArcNode {
  // 弧尾（tailVertex）：弧的出发点
  // 弧头（headVertex）：弧的指向点（箭头指向的顶点）
  int headVertex, tailVertex;

  // tailLink：串联弧尾相同的弧（同一条 firstOut 链上的下一个）
  // headLink：串联弧头相同的弧（同一条 firstIn 链上的下一个）
  struct ArcNode *headLink, *tailLink;
  int info;
} ArcNode;

typedef struct VertexNode {
  int data;
  ArcNode *firstIn, *firstOut;
} VertexNode;

#define MAX_VERTEX_NUM 10
typedef struct {
  VertexNode *xlist[MAX_VERTEX_NUM];
  int vexnum, arcnum;
} OLGraph;

int insert_arc(OLGraph *graph, int tail, int head) {
  if (tail < 0 || head < 0 || tail >= graph->vexnum || head >= graph->vexnum) {
    return 1;
  }

  VertexNode *tailNode = (graph->xlist)[tail];
  VertexNode *headNode = (graph->xlist)[head];

  ArcNode *arcNode = (ArcNode *)malloc(sizeof(ArcNode));
  if (arcNode == NULL) {
    return -1;
  }

  arcNode->headVertex = head;
  arcNode->tailVertex = tail;
  arcNode->headLink = NULL;
  arcNode->tailLink = NULL;

  if (tailNode->firstOut == NULL) {
    tailNode->firstOut = arcNode;
  } else {
    ArcNode *tailArcNode = tailNode->firstOut;
    while (tailArcNode->tailLink != NULL) {
      tailArcNode = tailArcNode->tailLink;
    }
    tailArcNode->tailLink = arcNode;
  }

  if (headNode->firstIn == NULL) {
    headNode->firstIn = arcNode;
  } else {
    ArcNode *headArcNode = headNode->firstIn;
    while (headArcNode->headLink != NULL) {
      headArcNode = headArcNode->headLink;
    }
    headArcNode->headLink = arcNode;
  }

  graph->arcnum += 1;

  return 0;
}

int insert_vertex_node(OLGraph *graph, int data) {
  if (graph->vexnum >= MAX_VERTEX_NUM) {
    return -1;
  }

  VertexNode *node = (VertexNode *)malloc(sizeof(VertexNode));

  if (node == NULL) {
    return -1;
  }

  node->data = data;
  node->firstIn = NULL;
  node->firstOut = NULL;

  int index = graph->vexnum;
  graph->xlist[index] = node;
  graph->vexnum += 1;
  return index;
}

OLGraph *create_graph() {
  OLGraph *graph = (OLGraph *)malloc(sizeof(OLGraph));
  if (graph == NULL) {
    return NULL;
  }

  graph->arcnum = 0;
  graph->vexnum = 0;

  int a_index = insert_vertex_node(graph, 'A');
  int b_index = insert_vertex_node(graph, 'B');
  int c_index = insert_vertex_node(graph, 'C');
  int d_index = insert_vertex_node(graph, 'D');

  insert_arc(graph, a_index, b_index);
  insert_arc(graph, a_index, c_index);
  insert_arc(graph, c_index, a_index);
  insert_arc(graph, d_index, a_index);
  insert_arc(graph, d_index, b_index);
  insert_arc(graph, c_index, d_index);
  insert_arc(graph, d_index, c_index);

  return graph;
}

int main() {
  VertexNode *A = (VertexNode *)malloc(sizeof(VertexNode));
  VertexNode *B = (VertexNode *)malloc(sizeof(VertexNode));
  VertexNode *C = (VertexNode *)malloc(sizeof(VertexNode));
  VertexNode *D = (VertexNode *)malloc(sizeof(VertexNode));

  VertexNode *graph[] = {A, B, C, D};

  ArcNode *AB = (ArcNode *)malloc(sizeof(ArcNode));
  ArcNode *AC = (ArcNode *)malloc(sizeof(ArcNode));
  ArcNode *CA = (ArcNode *)malloc(sizeof(ArcNode));
  ArcNode *CD = (ArcNode *)malloc(sizeof(ArcNode));
  ArcNode *DB = (ArcNode *)malloc(sizeof(ArcNode));
  ArcNode *DA = (ArcNode *)malloc(sizeof(ArcNode));
  ArcNode *DC = (ArcNode *)malloc(sizeof(ArcNode));

  A->firstOut = AB;
  AB->tailLink = AC;
  AC->tailLink = NULL;

  A->firstIn = CA;
  CA->headLink = DA;
  DA->headLink = NULL;

  B->firstOut = NULL;
  B->firstIn = DB;
  DB->headLink = AB;
  AB->headLink = NULL;

  C->firstOut = CA;
  CA->tailLink = CD;
  CD->tailLink = NULL;

  C->firstIn = AC;
  AC->headLink = DC;
  DC->headLink = NULL;

  D->firstOut = DA;
  DA->tailLink = DB;
  DB->tailLink = DC;
  DC->tailLink = NULL;

  D->firstIn = CD;
  CD->headLink = NULL;

  AB->tailVertex = 0;
  AB->headVertex = 1;
  AC->headVertex = 2;
  AC->tailVertex = 0;
  CA->headVertex = 0;
  CA->tailVertex = 2;
  CD->headVertex = 3;
  CD->tailVertex = 2;
  DB->headVertex = 1;
  DB->tailVertex = 3;
  DA->headVertex = 0;
  DA->tailVertex = 3;
  DC->headVertex = 2;
  DC->tailVertex = 3;

  A->data = 'A';
  B->data = 'B';
  C->data = 'C';
  D->data = 'D';

  return 0;
}