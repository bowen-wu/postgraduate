#include <stdio.h>

// 无向图：邻接多重表
typedef struct VertexNode {
  int data;
  Edge *first_edge;
} VertexNode;

typedef struct Edge {
  int left_node, right_node;
  Edge *left_link, *right_link;
  int info;
} Edge;



#define MAX_VERTEX_NUM 10
typedef struct OLGraph {
  VertexNode *list[MAX_VERTEX_NUM];
} OLGraph;

int insert_vertex(OLGraph *graph, int data) {}

int insert_edge(OLGraph *graph, int left, int right) {

}

int delete_vertex(OLGraph *graph, int data) {

}

int delete_edge(OLGraph *graph) {

}

int main() { return 0; }
