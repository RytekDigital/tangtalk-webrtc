'use strict';

const React = require('react');
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
const PropTypes = require('prop-types');

const { default: clsx } = require('clsx');
const { DateTime } = require('luxon');
const { useInView } = require('react-intersection-observer');
const { resolveMime } = require('friendly-mimes');

const ReactBootstrap = require('react-bootstrap');
const Media = ReactBootstrap.Media;

const { makeStyles } = require('@material-ui/core/styles');
const {
    Divider,
    Grid,
    MenuItem,
    Paper,
    Typography,
    IconButton
} = require('@material-ui/core');
const {
    Lock: LockIcon,
    Done: DoneIcon,
    DoneAll: DoneAllIcon,
    ErrorOutline: ErrorOutlineIcon,
    ArrowDropDown,
    ArrowRight,
    DescriptionOutlined: FileIcon
} = require('@material-ui/icons');

const CustomContextMenu = require('../CustomContextMenu');
const UserIcon = require('../UserIcon');

const fileTransferUtils = require('../../fileTransferUtils');


function isElectron() {
    if (typeof window.process !== 'undefined') {
        if (window.process.versions.electron !== '' && window.process.platform === 'darwin') {
            return true;
        }
    }
    return false;
}

const styleSheet = makeStyles((theme) => ({
    chipSmall: {
        height: 18,
        fontSize: 11
    },
    iconSmall: {
        width: 12,
        height: 12
    },
    doneIcon: {
        fontSize: 15,
        verticalAlign: 'middle',
        color: 'green'
    },
    errorOutlineIcon: {
        fontSize: 17,
        verticalAlign: 'middle',
        color: '#a94442'
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    },
    itemRed: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: 'rgb(169, 68, 66)',
        minHeight: 0
    },
    lockIcon: {
        fontSize: 15,
        verticalAlign: 'middle',
        color: '#ccc'
    },
    fixFont: {
        fontFamily: 'inherit'
    }
}));

const FileTransferMessage = ({
    message,
    scroll,
    cont,
    displayed,
    focus,
    contactCache,
    removeMessage,
    imdnStates,
    enableMenu,
    account,
    showModal
}) => {
    const classes = styleSheet();
    const [state, setState] = useState('');
    const [parsedContent, setParsedContent] = useState();
    const [header, setHeader] = useState();
    const [parsedJsonContent] = useState(() => {
        try {
            return JSON.parse(message.content);
        }
        catch (e) {
            return {}
        }
    });

    const messageRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [hidden, setHidden] = useState(false);

    const sender = message.sender.displayName || message.sender.uri;
    const time = DateTime.fromJSDate(message.timestamp).toFormat('HH:mm');
    const { ref, inView, entry } = useInView({
        threshold: 0
    });


    useEffect(() => {
        if (parsedContent !== undefined) {
            scroll()
        }
    }, [parsedContent, scroll]
    );

    useEffect(() => {
        if (parsedJsonContent.filetype && !parsedJsonContent.filetype.startsWith('image/')) {
            if (hidden) {
                setHeader(
                    <Typography className={classes.fixFont} style={{ fontSize: 12 }} variant="body2">{parsedJsonContent.filename.replace('.asc', '').replace(/_/g, ' ')}</Typography>
                )
            } else {
                let filetype = parsedJsonContent.filetype;
                if (parsedJsonContent.filetype) {
                    try {
                        filetype = resolveMime(parsedJsonContent.filetype).name;
                    }
                    catch (error) {
                        // no op
                    }
                }
                setHeader(
                    <Typography className={classes.fixFont} style={{ fontSize: 12 }} variant="body2" color="textSecondary">{filetype}</Typography>
                )

            }
        }
    }, [hidden, classes.fixFont, parsedJsonContent])

    useEffect(() => {
        const fileSize = (size) => {
            let i = Math.floor(Math.log(size) / Math.log(1024));
            return (size / Math.pow(1024, i)).toFixed(1) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
        }

        const generateFileBlock = () => {
            let filetype = 'Unknown';
            if (parsedJsonContent.filetype) {
                try {
                    filetype = resolveMime(parsedJsonContent.filetype).name;
                }
                catch (error) {
                    // no op
                }
            }
            if (Object.keys(parsedJsonContent).length === 0) {
                setState('error');
                setParsedContent(
                    <Typography className={classes.fixFont} style={{ fontSize: 14, color: 'rgb(169, 68, 66)' }}>Couldn't parse filetransfer message</Typography>
                );
                return;
            }
            setHeader(
                <Typography className={classes.fixFont} style={{ fontSize: 12, alignSelf: 'center' }} variant="body2" color="textSecondary">{filetype}</Typography>
            )
            setParsedContent(
                <div
                    onClick={(event) => { event.preventDefault(); fileTransferUtils.download(account, parsedJsonContent) }}
                >
                    <Paper variant="outlined">
                        <Grid container spacing={2}>
                            <Grid item>
                                <FileIcon className={classes.fixFont} style={{ height: '100%', margin: '0 auto', fontSize: 45 }} />
                            </Grid>
                            <Grid style={{ display: 'flex', alignItems: 'center' }} item>
                                <div>
                                    <Typography className={classes.fixFont} style={{ fontSize: 16, fontWeight: 300 }} variant="subtitle1">{parsedJsonContent.filename.replace('.asc', '').replace(/_/g, ' ')}</Typography>
                                    <Typography className={classes.fixFont} style={{ fontSize: 12 }} variant="body2" color="textSecondary">{fileSize(parsedJsonContent.filesize)} {filetype}</Typography>
                                </div>
                            </Grid>
                        </Grid>
                    </Paper>
                </div>
            );
        }

        if (message.contentType == ('application/sylk-file-transfer')) {
            if (parsedJsonContent.filetype && parsedJsonContent.filetype.startsWith('image/')) {
                fileTransferUtils.generateThumbnail(account, message.id, parsedJsonContent)
                    .then(([image, filename, w, h]) => {
                        setHeader(
                            <Typography className={classes.fixFont} style={{ display: 'flex', fontSize: 12, alignSelf: 'center' }} variant="body2" color="textSecondary">{filename.replace(/_/g, ' ')}
                            </Typography>
                        )
                        setParsedContent(
                            <Paper variant="outlined" style={{ display: 'inline-block', borderRadius: 7, overflow: 'hidden', cursor: 'zoom-in' }}>
                                <img className="img-responsive img-rounded" style={{ ...w && { width: w }, ...h && { height: h } }} src={image} onClick={showModal} />
                            </Paper>
                        );
                    }).catch(error => {
                        generateFileBlock(parsedJsonContent);
                    })
            } else {
                generateFileBlock(parsedJsonContent);
            }
        }

        const finalStates = new Set(['displayed', 'received']);

        const stateChanged = (oldState, newState) => {
            setState(newState);
        };

        if (message instanceof require('events').EventEmitter
            && (message.state === 'pending' || (imdnStates && !finalStates.has(message.state)))
        ) {
            message.on('stateChanged', stateChanged);
        }

        if (Object.keys(parsedJsonContent).length === 0) {
            setState('error');
        } else {
            setState(message.state);
        }

        return () => {
            if (message instanceof require('events').EventEmitter) {
                message.removeListener('stateChanged', stateChanged);
            }
        }
    }, [message, classes]) // eslint-disable-line react-hooks/exhaustive-deps

    const scrollToMessage = () => {
        messageRef.current.scrollIntoView({ behavior: 'smooth' })
    };

    useEffect(() => {
        if (messageRef.current !== null && focus === true) {
            scrollToMessage()
        }
    }, [focus]);

    useEffect(() => {
        if (inView) {
            isDisplayed();
        }
    }, [inView, isDisplayed]);

    const isDisplayed = React.useCallback(() => {
        if (displayed) {
            displayed();
        }
    }, [displayed]);

    let theme = clsx({
        'text-left': true,
        'pending': state === 'pending',
        'text-danger': state === 'failed' || state === 'error',
        'continued': cont && message.type !== 'status',
        'status': message.type === 'status'
    });

    const statusIcon = () => {
        if (state === 'accepted') {
            return (<DoneIcon style={{ color: '#888' }} className={classes.doneIcon} />);
        }
        if (state === 'delivered') {
            return (<DoneIcon className={classes.doneIcon} />);
        }
        if (state === 'displayed') {
            return (<DoneAllIcon className={classes.doneIcon} />);
        }
        if (state === 'failed') {
            return (<ErrorOutlineIcon className={classes.errorOutlineIcon} titleAccess="Not Delivered" />);
        }
        if (state === 'error') {
            return (<ErrorOutlineIcon className={classes.errorOutlineIcon} titleAccess="Display Error" />);
        }
    };

    const getDisplayName = (uri) => {
        if (contactCache !== undefined && contactCache.has(uri)) {
            return { uri: uri, displayName: contactCache.get(uri) };
        }
        return { uri: uri };
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        const { clientX, clientY } = e;
        const virtualElement = {
            clientWidth: 0,
            clientHeight: 0,
            getBoundingClientRect: () => ({
                width: 0,
                height: 0,
                top: clientY,
                right: clientX,
                bottom: clientY,
                left: clientX
            })
        };
        setAnchorEl(virtualElement);
    }

    const copy = () => {
        let { url } = JSON.parse(message.content);
        if ('clipboard' in navigator) {
            navigator.clipboard.writeText(url);
        } else {
            document.execCommand('copy', true, url);
        }
    };

    const _removeMessage = () => {
        if (typeof removeMessage === 'function') {
            removeMessage();
        }
    }

    const handleClose = () => {
        setAnchorEl(null);
    };

    const generateMenu = () => {
        if (!parsedJsonContent.filetype) {
            return;
        }
        if (parsedJsonContent.filetype.startsWith('image/')) {
            return (
                <CustomContextMenu
                    open={Boolean(anchorEl)}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    keepMounted={false}
                >
                    {!isElectron() &&
                        <MenuItem className={classes.item} onClick={() => { fileTransferUtils.openInNewTab(account, parsedJsonContent); handleClose() }}>
                            Open in new tab
                        </MenuItem>
                    }
                    <MenuItem className={classes.item} onClick={() => { fileTransferUtils.download(account, parsedJsonContent); handleClose() }} >
                        Download Image
                    </MenuItem>
                    {!message.isSecure &&
                        <MenuItem className={classes.item} onClick={() => { copy(); handleClose() }}>
                            Copy link to file
                        </MenuItem>
                    }
                    <Divider />
                    <MenuItem className={classes.itemRed} onClick={() => { _removeMessage(); handleClose() }}>
                        Delete file
                    </MenuItem>
                </CustomContextMenu>
            );
        }
        return (
            <CustomContextMenu
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                keepMounted={false}
            >

                <MenuItem className={classes.item} onClick={() => { fileTransferUtils.download(account, parsedJsonContent); handleClose() }} >
                    Download File
                </MenuItem>
                {!message.isSecure &&
                    <MenuItem className={classes.item} onClick={() => { copy(); handleClose() }}>
                        Copy link to file
                    </MenuItem>
                }
                <Divider />
                <MenuItem className={classes.itemRed} onClick={() => { _removeMessage(); handleClose() }}>
                    Delete file
                </MenuItem>
            </CustomContextMenu>
        );
    }

    if (cont || message.type === 'status') {
        return (
            <div ref={ref}>
                <Media className={theme} onContextMenu={handleContextMenu}>
                    {enableMenu && message.type !== 'status' &&
                        generateMenu()
                    }

                    <div ref={messageRef} />
                    {message.type !== 'status' &&
                        <Media.Left className="timestamp-continued"><span>{time}</span></Media.Left>
                    }
                    <Media.Body className="vertical-center">
                        {state !== 'error' &&
                            <div style={{ display: 'flex', alignItems: 'end' }}>
                                {header}
                                <IconButton
                                    size="small"
                                    onClick={() => setHidden(!hidden)}
                                >
                                    {hidden ? <ArrowRight /> : <ArrowDropDown />}
                                </IconButton>
                            </div>
                        }
                        {!hidden &&
                            parsedContent
                        }
                    </Media.Body>
                    <Media.Right style={{ minWidth: 55 }}>
                        <span className="pull-right" style={{ paddingRight: '15px', whiteSpace: 'nowrap' }}>
                            {message.isSecure && <LockIcon className={classes.lockIcon} />}
                            {statusIcon()}
                            {message.type === 'status' &&
                                <pre>{time}</pre>
                            }
                        </span>
                    </Media.Right>
                </Media>
            </div>
        );
    }

    return (
        <div ref={ref}>
            <Media className={theme} onContextMenu={handleContextMenu}>
                {enableMenu &&
                    generateMenu()
                }
                <div ref={messageRef} />
                <Media.Left>
                    <UserIcon identity={getDisplayName(message.sender.uri)} />
                </Media.Left>
                <Media.Body className="vertical-center">
                    <Media.Heading>
                        {getDisplayName(message.sender.uri).displayName || sender}&nbsp;
                        <span>{time}</span>
                        <span className="pull-right" style={{ paddingRight: '15px' }}>
                            {message.isSecure && <LockIcon className={classes.lockIcon} />}
                            {statusIcon()}
                        </span>
                    </Media.Heading>

                    {state !== 'error' &&
                        <div style={{ display: 'flex', alignItems: 'end' }}>
                            {header}
                            <IconButton
                                size="small"
                                onClick={() => setHidden(!hidden)}
                            >
                                {hidden ? <ArrowRight /> : <ArrowDropDown />}
                            </IconButton>
                        </div>
                    }
                    {!hidden &&
                        <div style={{ maxWidth: 'calc(100% - 55px)' }}>
                            {parsedContent}
                        </div>
                    }
                </Media.Body>
            </Media>
        </div>
    );
};

FileTransferMessage.propTypes = {
    message: PropTypes.object.isRequired,
    scroll: PropTypes.func.isRequired,
    removeMessage: PropTypes.func,
    displayed: PropTypes.func,
    cont: PropTypes.bool,
    displayed: PropTypes.func,
    focus: PropTypes.bool,
    contactCache: PropTypes.object,
    imdnStates: PropTypes.bool,
    enableMenu: PropTypes.bool,
    account: PropTypes.object.isRequired,
    showModal: PropTypes.func
};


module.exports = FileTransferMessage;
