import ErrorIcon from '@sourcegraph/icons/lib/Error'
import LoaderIcon from '@sourcegraph/icons/lib/Loader'
import * as H from 'history'
import * as React from 'react'
import { Redirect } from 'react-router'
import { combineLatest, Subject, Subscription } from 'rxjs'
import { catchError, delay, distinctUntilChanged, map, repeatWhen, startWith, switchMap, tap } from 'rxjs/operators'
import * as GQL from '../../../backend/graphqlschema'
import { DiscussionsComment } from '../../../discussions/DiscussionsComment'
import { eventLogger } from '../../../tracking/eventLogger'
import { formatHash } from '../../../util/url'
import { addCommentToThread, fetchDiscussionThreadAndComments } from './DiscussionsBackend'
import { DiscussionsInput } from './DiscussionsInput'
import { DiscussionsNavbar } from './DiscussionsNavbar'

interface Props {
    threadID: GQL.ID
    commentID?: GQL.ID
    repoID: GQL.ID
    rev: string | undefined
    filePath: string
    history: H.History
    location: H.Location
}

interface State {
    loading: boolean
    error?: any
    thread?: GQL.IDiscussionThread
}

export class DiscussionsThread extends React.PureComponent<Props, State> {
    private componentUpdates = new Subject<Props>()
    private subscriptions = new Subscription()

    constructor(props: Props) {
        super(props)
        this.state = {
            loading: true,
        }
    }

    public componentDidMount(): void {
        eventLogger.logViewEvent('DiscussionsThread')

        // TODO(slimsag:discussions): ASAP: changing threadID manually in URL does not work. Can't click links to threads/comments effectively.
        this.subscriptions.add(
            combineLatest(this.componentUpdates.pipe(startWith(this.props)))
                .pipe(
                    distinctUntilChanged(([a], [b]) => a.threadID !== b.threadID),
                    switchMap(([props]) =>
                        fetchDiscussionThreadAndComments(props.threadID).pipe(
                            map(thread => ({ thread, loading: false })),
                            catchError(error => {
                                console.error(error)
                                return [{ error, loading: false }]
                            }),
                            repeatWhen(delay(2500))
                        )
                    )
                )
                .subscribe(
                    stateUpdate => this.setState(state => ({ ...state, ...stateUpdate })),
                    err => console.error(err)
                )
        )
    }

    public componentWillReceiveProps(props: Props): void {
        this.componentUpdates.next(props)
    }

    public componentWillUnmount(): void {
        this.subscriptions.unsubscribe()
    }

    public render(): JSX.Element | null {
        // TODO(slimsag:discussions): future: test error state + cleanup CSS

        const { error, loading, thread } = this.state
        const { location, commentID } = this.props

        // If the thread is loaded, ensure that the URL hash is updated to
        // reflect the line that the discussion was created on.
        if (thread) {
            const desiredHash = this.urlHashWithLine(thread, commentID)
            if (desiredHash !== location.hash) {
                const discussionURL = location.pathname + location.search + desiredHash
                return <Redirect to={discussionURL} />
            }
        }

        return (
            <div className="discussions-thread">
                <DiscussionsNavbar {...this.props} threadTitle={thread ? thread.title : undefined} />
                {loading && <LoaderIcon className="icon-inline" />}
                {error && (
                    <div className="discussions-thread__error alert alert-danger">
                        <ErrorIcon className="icon-inline discussions-thread__error-icon" />
                        Error loading thread: {error.message}
                    </div>
                )}
                {thread && (
                    <div className="discussions-thread__comments">
                        {thread.comments.nodes.map(node => (
                            <DiscussionsComment key={node.id} {...this.props} comment={node} />
                        ))}
                        <DiscussionsInput
                            key="input"
                            submitLabel="Comment"
                            noExplicitTitle={true}
                            onSubmit={this.onSubmit}
                            {...this.props}
                        />
                    </div>
                )}
            </div>
        )
    }

    /**
     * Produces a URL hash for linking to the given discussion thread and the
     * line that it was created on.
     * @param thread The thread to link to.
     */
    private urlHashWithLine(thread: GQL.IDiscussionThread, commentID?: GQL.ID): string {
        const hash = new URLSearchParams()
        hash.set('tab', 'discussions')
        hash.set('threadID', thread.id)
        if (commentID) {
            hash.set('commentID', commentID)
        }

        return thread.target.__typename === 'DiscussionThreadTargetRepo' && thread.target.selection !== null
            ? formatHash(
                  {
                      line: thread.target.selection.startLine,
                      character: thread.target.selection.startCharacter,
                      endLine: thread.target.selection.endLine,
                      endCharacter: thread.target.selection.endCharacter,
                  },
                  hash
              )
            : '#' + hash.toString()
    }

    private onSubmit = (title: string, contents: string) =>
        addCommentToThread(this.props.threadID, contents).pipe(
            tap(thread => this.setState({ thread })),
            map(thread => void 0)
        )
}
