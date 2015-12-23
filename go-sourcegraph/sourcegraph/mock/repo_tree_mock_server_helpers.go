package mock

import (
	"testing"

	"golang.org/x/net/context"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"sourcegraph.com/sourcegraph/vcsstore/vcsclient"
	"src.sourcegraph.com/sourcegraph/go-sourcegraph/sourcegraph"
)

func (s *RepoTreeServer) MockGet_Return_NoCheck(t *testing.T, returns *sourcegraph.TreeEntry) (called *bool) {
	called = new(bool)
	s.Get_ = func(ctx context.Context, op *sourcegraph.RepoTreeGetOp) (*sourcegraph.TreeEntry, error) {
		*called = true
		return returns, nil
	}
	return
}

func (s *RepoTreeServer) MockGet_Return_FileContents(t *testing.T, path, contents string) (called *bool) {
	called = new(bool)
	s.Get_ = func(ctx context.Context, op *sourcegraph.RepoTreeGetOp) (*sourcegraph.TreeEntry, error) {
		if op.Entry.Path != path {
			t.Errorf("got path %q, want %q", op.Entry.Path, path)
			return nil, grpc.Errorf(codes.NotFound, "path %q not found", op.Entry.Path)
		}
		*called = true
		return &sourcegraph.TreeEntry{TreeEntry: &vcsclient.TreeEntry{
			Name:     path,
			Type:     vcsclient.FileEntry,
			Contents: []byte(contents),
		}}, nil
	}
	return
}

func (s *RepoTreeServer) MockGet_NotFound(t *testing.T) (called *bool) {
	called = new(bool)
	s.Get_ = func(ctx context.Context, op *sourcegraph.RepoTreeGetOp) (*sourcegraph.TreeEntry, error) {
		*called = true
		return nil, grpc.Errorf(codes.NotFound, "path %q not found", op.Entry.Path)
	}
	return
}
