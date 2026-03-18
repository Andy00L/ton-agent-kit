import {
    Cell,
    Slice,
    Address,
    Builder,
    beginCell,
    ComputeError,
    TupleItem,
    TupleReader,
    Dictionary,
    contractAddress,
    address,
    ContractProvider,
    Sender,
    Contract,
    ContractABI,
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type DataSize = {
    $$type: 'DataSize';
    cells: bigint;
    bits: bigint;
    refs: bigint;
}

export function storeDataSize(src: DataSize) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.cells, 257);
        b_0.storeInt(src.bits, 257);
        b_0.storeInt(src.refs, 257);
    };
}

export function loadDataSize(slice: Slice) {
    const sc_0 = slice;
    const _cells = sc_0.loadIntBig(257);
    const _bits = sc_0.loadIntBig(257);
    const _refs = sc_0.loadIntBig(257);
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function loadGetterTupleDataSize(source: TupleReader) {
    const _cells = source.readBigNumber();
    const _bits = source.readBigNumber();
    const _refs = source.readBigNumber();
    return { $$type: 'DataSize' as const, cells: _cells, bits: _bits, refs: _refs };
}

export function storeTupleDataSize(source: DataSize) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.cells);
    builder.writeNumber(source.bits);
    builder.writeNumber(source.refs);
    return builder.build();
}

export function dictValueParserDataSize(): DictionaryValue<DataSize> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDataSize(src)).endCell());
        },
        parse: (src) => {
            return loadDataSize(src.loadRef().beginParse());
        }
    }
}

export type SignedBundle = {
    $$type: 'SignedBundle';
    signature: Buffer;
    signedData: Slice;
}

export function storeSignedBundle(src: SignedBundle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBuffer(src.signature);
        b_0.storeBuilder(src.signedData.asBuilder());
    };
}

export function loadSignedBundle(slice: Slice) {
    const sc_0 = slice;
    const _signature = sc_0.loadBuffer(64);
    const _signedData = sc_0;
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function loadGetterTupleSignedBundle(source: TupleReader) {
    const _signature = source.readBuffer();
    const _signedData = source.readCell().asSlice();
    return { $$type: 'SignedBundle' as const, signature: _signature, signedData: _signedData };
}

export function storeTupleSignedBundle(source: SignedBundle) {
    const builder = new TupleBuilder();
    builder.writeBuffer(source.signature);
    builder.writeSlice(source.signedData.asCell());
    return builder.build();
}

export function dictValueParserSignedBundle(): DictionaryValue<SignedBundle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSignedBundle(src)).endCell());
        },
        parse: (src) => {
            return loadSignedBundle(src.loadRef().beginParse());
        }
    }
}

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    const sc_0 = slice;
    const _code = sc_0.loadRef();
    const _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function loadGetterTupleStateInit(source: TupleReader) {
    const _code = source.readCell();
    const _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

export function storeTupleStateInit(source: StateInit) {
    const builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

export function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounceable: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeBit(src.bounceable);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    const sc_0 = slice;
    const _bounceable = sc_0.loadBit();
    const _sender = sc_0.loadAddress();
    const _value = sc_0.loadIntBig(257);
    const _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function loadGetterTupleContext(source: TupleReader) {
    const _bounceable = source.readBoolean();
    const _sender = source.readAddress();
    const _value = source.readBigNumber();
    const _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounceable: _bounceable, sender: _sender, value: _value, raw: _raw };
}

export function storeTupleContext(source: Context) {
    const builder = new TupleBuilder();
    builder.writeBoolean(source.bounceable);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

export function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadSendParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleSendParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _code = source.readCellOpt();
    const _data = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'SendParameters' as const, mode: _mode, body: _body, code: _code, data: _data, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleSendParameters(source: SendParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type MessageParameters = {
    $$type: 'MessageParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    to: Address;
    bounce: boolean;
}

export function storeMessageParameters(src: MessageParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeAddress(src.to);
        b_0.storeBit(src.bounce);
    };
}

export function loadMessageParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _to = sc_0.loadAddress();
    const _bounce = sc_0.loadBit();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function loadGetterTupleMessageParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _to = source.readAddress();
    const _bounce = source.readBoolean();
    return { $$type: 'MessageParameters' as const, mode: _mode, body: _body, value: _value, to: _to, bounce: _bounce };
}

export function storeTupleMessageParameters(source: MessageParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeAddress(source.to);
    builder.writeBoolean(source.bounce);
    return builder.build();
}

export function dictValueParserMessageParameters(): DictionaryValue<MessageParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeMessageParameters(src)).endCell());
        },
        parse: (src) => {
            return loadMessageParameters(src.loadRef().beginParse());
        }
    }
}

export type DeployParameters = {
    $$type: 'DeployParameters';
    mode: bigint;
    body: Cell | null;
    value: bigint;
    bounce: boolean;
    init: StateInit;
}

export function storeDeployParameters(src: DeployParameters) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        b_0.storeInt(src.value, 257);
        b_0.storeBit(src.bounce);
        b_0.store(storeStateInit(src.init));
    };
}

export function loadDeployParameters(slice: Slice) {
    const sc_0 = slice;
    const _mode = sc_0.loadIntBig(257);
    const _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    const _value = sc_0.loadIntBig(257);
    const _bounce = sc_0.loadBit();
    const _init = loadStateInit(sc_0);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function loadGetterTupleDeployParameters(source: TupleReader) {
    const _mode = source.readBigNumber();
    const _body = source.readCellOpt();
    const _value = source.readBigNumber();
    const _bounce = source.readBoolean();
    const _init = loadGetterTupleStateInit(source);
    return { $$type: 'DeployParameters' as const, mode: _mode, body: _body, value: _value, bounce: _bounce, init: _init };
}

export function storeTupleDeployParameters(source: DeployParameters) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeNumber(source.value);
    builder.writeBoolean(source.bounce);
    builder.writeTuple(storeTupleStateInit(source.init));
    return builder.build();
}

export function dictValueParserDeployParameters(): DictionaryValue<DeployParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployParameters(src)).endCell());
        },
        parse: (src) => {
            return loadDeployParameters(src.loadRef().beginParse());
        }
    }
}

export type StdAddress = {
    $$type: 'StdAddress';
    workchain: bigint;
    address: bigint;
}

export function storeStdAddress(src: StdAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 8);
        b_0.storeUint(src.address, 256);
    };
}

export function loadStdAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(8);
    const _address = sc_0.loadUintBig(256);
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleStdAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readBigNumber();
    return { $$type: 'StdAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleStdAddress(source: StdAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeNumber(source.address);
    return builder.build();
}

export function dictValueParserStdAddress(): DictionaryValue<StdAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStdAddress(src)).endCell());
        },
        parse: (src) => {
            return loadStdAddress(src.loadRef().beginParse());
        }
    }
}

export type VarAddress = {
    $$type: 'VarAddress';
    workchain: bigint;
    address: Slice;
}

export function storeVarAddress(src: VarAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeInt(src.workchain, 32);
        b_0.storeRef(src.address.asCell());
    };
}

export function loadVarAddress(slice: Slice) {
    const sc_0 = slice;
    const _workchain = sc_0.loadIntBig(32);
    const _address = sc_0.loadRef().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function loadGetterTupleVarAddress(source: TupleReader) {
    const _workchain = source.readBigNumber();
    const _address = source.readCell().asSlice();
    return { $$type: 'VarAddress' as const, workchain: _workchain, address: _address };
}

export function storeTupleVarAddress(source: VarAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.workchain);
    builder.writeSlice(source.address.asCell());
    return builder.build();
}

export function dictValueParserVarAddress(): DictionaryValue<VarAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVarAddress(src)).endCell());
        },
        parse: (src) => {
            return loadVarAddress(src.loadRef().beginParse());
        }
    }
}

export type BasechainAddress = {
    $$type: 'BasechainAddress';
    hash: bigint | null;
}

export function storeBasechainAddress(src: BasechainAddress) {
    return (builder: Builder) => {
        const b_0 = builder;
        if (src.hash !== null && src.hash !== undefined) { b_0.storeBit(true).storeInt(src.hash, 257); } else { b_0.storeBit(false); }
    };
}

export function loadBasechainAddress(slice: Slice) {
    const sc_0 = slice;
    const _hash = sc_0.loadBit() ? sc_0.loadIntBig(257) : null;
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function loadGetterTupleBasechainAddress(source: TupleReader) {
    const _hash = source.readBigNumberOpt();
    return { $$type: 'BasechainAddress' as const, hash: _hash };
}

export function storeTupleBasechainAddress(source: BasechainAddress) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.hash);
    return builder.build();
}

export function dictValueParserBasechainAddress(): DictionaryValue<BasechainAddress> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeBasechainAddress(src)).endCell());
        },
        parse: (src) => {
            return loadBasechainAddress(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function loadGetterTupleDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

export function storeTupleDeploy(source: Deploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function loadGetterTupleDeployOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

export function storeTupleDeployOk(source: DeployOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function loadGetterTupleFactoryDeploy(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

export function storeTupleFactoryDeploy(source: FactoryDeploy) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

export function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwner = {
    $$type: 'ChangeOwner';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwner(src: ChangeOwner) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2174598809, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwner(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2174598809) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadTupleChangeOwner(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadGetterTupleChangeOwner(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwner' as const, queryId: _queryId, newOwner: _newOwner };
}

export function storeTupleChangeOwner(source: ChangeOwner) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

export function dictValueParserChangeOwner(): DictionaryValue<ChangeOwner> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChangeOwner(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwner(src.loadRef().beginParse());
        }
    }
}

export type ChangeOwnerOk = {
    $$type: 'ChangeOwnerOk';
    queryId: bigint;
    newOwner: Address;
}

export function storeChangeOwnerOk(src: ChangeOwnerOk) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(846932810, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.newOwner);
    };
}

export function loadChangeOwnerOk(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 846932810) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    const _newOwner = sc_0.loadAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadTupleChangeOwnerOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

export function loadGetterTupleChangeOwnerOk(source: TupleReader) {
    const _queryId = source.readBigNumber();
    const _newOwner = source.readAddress();
    return { $$type: 'ChangeOwnerOk' as const, queryId: _queryId, newOwner: _newOwner };
}

export function storeTupleChangeOwnerOk(source: ChangeOwnerOk) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.newOwner);
    return builder.build();
}

export function dictValueParserChangeOwnerOk(): DictionaryValue<ChangeOwnerOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeChangeOwnerOk(src)).endCell());
        },
        parse: (src) => {
            return loadChangeOwnerOk(src.loadRef().beginParse());
        }
    }
}

export type Deposit = {
    $$type: 'Deposit';
    queryId: bigint;
}

export function storeDeposit(src: Deposit) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(4171902866, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeposit(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 4171902866) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deposit' as const, queryId: _queryId };
}

export function loadTupleDeposit(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deposit' as const, queryId: _queryId };
}

export function loadGetterTupleDeposit(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Deposit' as const, queryId: _queryId };
}

export function storeTupleDeposit(source: Deposit) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserDeposit(): DictionaryValue<Deposit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeposit(src)).endCell());
        },
        parse: (src) => {
            return loadDeposit(src.loadRef().beginParse());
        }
    }
}

export type Release = {
    $$type: 'Release';
    queryId: bigint;
}

export function storeRelease(src: Release) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(408342921, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadRelease(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 408342921) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Release' as const, queryId: _queryId };
}

export function loadTupleRelease(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Release' as const, queryId: _queryId };
}

export function loadGetterTupleRelease(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Release' as const, queryId: _queryId };
}

export function storeTupleRelease(source: Release) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserRelease(): DictionaryValue<Release> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRelease(src)).endCell());
        },
        parse: (src) => {
            return loadRelease(src.loadRef().beginParse());
        }
    }
}

export type Refund = {
    $$type: 'Refund';
    queryId: bigint;
}

export function storeRefund(src: Refund) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2214270485, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadRefund(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2214270485) { throw Error('Invalid prefix'); }
    const _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Refund' as const, queryId: _queryId };
}

export function loadTupleRefund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Refund' as const, queryId: _queryId };
}

export function loadGetterTupleRefund(source: TupleReader) {
    const _queryId = source.readBigNumber();
    return { $$type: 'Refund' as const, queryId: _queryId };
}

export function storeTupleRefund(source: Refund) {
    const builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

export function dictValueParserRefund(): DictionaryValue<Refund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRefund(src)).endCell());
        },
        parse: (src) => {
            return loadRefund(src.loadRef().beginParse());
        }
    }
}

export type DeliveryConfirmed = {
    $$type: 'DeliveryConfirmed';
    x402TxHash: string;
}

export function storeDeliveryConfirmed(src: DeliveryConfirmed) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3537337858, 32);
        b_0.storeStringRefTail(src.x402TxHash);
    };
}

export function loadDeliveryConfirmed(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3537337858) { throw Error('Invalid prefix'); }
    const _x402TxHash = sc_0.loadStringRefTail();
    return { $$type: 'DeliveryConfirmed' as const, x402TxHash: _x402TxHash };
}

export function loadTupleDeliveryConfirmed(source: TupleReader) {
    const _x402TxHash = source.readString();
    return { $$type: 'DeliveryConfirmed' as const, x402TxHash: _x402TxHash };
}

export function loadGetterTupleDeliveryConfirmed(source: TupleReader) {
    const _x402TxHash = source.readString();
    return { $$type: 'DeliveryConfirmed' as const, x402TxHash: _x402TxHash };
}

export function storeTupleDeliveryConfirmed(source: DeliveryConfirmed) {
    const builder = new TupleBuilder();
    builder.writeString(source.x402TxHash);
    return builder.build();
}

export function dictValueParserDeliveryConfirmed(): DictionaryValue<DeliveryConfirmed> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeliveryConfirmed(src)).endCell());
        },
        parse: (src) => {
            return loadDeliveryConfirmed(src.loadRef().beginParse());
        }
    }
}

export type AutoRelease = {
    $$type: 'AutoRelease';
}

export function storeAutoRelease(src: AutoRelease) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1179475699, 32);
    };
}

export function loadAutoRelease(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1179475699) { throw Error('Invalid prefix'); }
    return { $$type: 'AutoRelease' as const };
}

export function loadTupleAutoRelease(source: TupleReader) {
    return { $$type: 'AutoRelease' as const };
}

export function loadGetterTupleAutoRelease(source: TupleReader) {
    return { $$type: 'AutoRelease' as const };
}

export function storeTupleAutoRelease(source: AutoRelease) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserAutoRelease(): DictionaryValue<AutoRelease> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAutoRelease(src)).endCell());
        },
        parse: (src) => {
            return loadAutoRelease(src.loadRef().beginParse());
        }
    }
}

export type OpenDispute = {
    $$type: 'OpenDispute';
}

export function storeOpenDispute(src: OpenDispute) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2663435750, 32);
    };
}

export function loadOpenDispute(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2663435750) { throw Error('Invalid prefix'); }
    return { $$type: 'OpenDispute' as const };
}

export function loadTupleOpenDispute(source: TupleReader) {
    return { $$type: 'OpenDispute' as const };
}

export function loadGetterTupleOpenDispute(source: TupleReader) {
    return { $$type: 'OpenDispute' as const };
}

export function storeTupleOpenDispute(source: OpenDispute) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserOpenDispute(): DictionaryValue<OpenDispute> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeOpenDispute(src)).endCell());
        },
        parse: (src) => {
            return loadOpenDispute(src.loadRef().beginParse());
        }
    }
}

export type JoinDispute = {
    $$type: 'JoinDispute';
}

export function storeJoinDispute(src: JoinDispute) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3263842436, 32);
    };
}

export function loadJoinDispute(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3263842436) { throw Error('Invalid prefix'); }
    return { $$type: 'JoinDispute' as const };
}

export function loadTupleJoinDispute(source: TupleReader) {
    return { $$type: 'JoinDispute' as const };
}

export function loadGetterTupleJoinDispute(source: TupleReader) {
    return { $$type: 'JoinDispute' as const };
}

export function storeTupleJoinDispute(source: JoinDispute) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserJoinDispute(): DictionaryValue<JoinDispute> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeJoinDispute(src)).endCell());
        },
        parse: (src) => {
            return loadJoinDispute(src.loadRef().beginParse());
        }
    }
}

export type VoteRelease = {
    $$type: 'VoteRelease';
}

export function storeVoteRelease(src: VoteRelease) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(44752475, 32);
    };
}

export function loadVoteRelease(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 44752475) { throw Error('Invalid prefix'); }
    return { $$type: 'VoteRelease' as const };
}

export function loadTupleVoteRelease(source: TupleReader) {
    return { $$type: 'VoteRelease' as const };
}

export function loadGetterTupleVoteRelease(source: TupleReader) {
    return { $$type: 'VoteRelease' as const };
}

export function storeTupleVoteRelease(source: VoteRelease) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserVoteRelease(): DictionaryValue<VoteRelease> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVoteRelease(src)).endCell());
        },
        parse: (src) => {
            return loadVoteRelease(src.loadRef().beginParse());
        }
    }
}

export type VoteRefund = {
    $$type: 'VoteRefund';
}

export function storeVoteRefund(src: VoteRefund) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(1287417331, 32);
    };
}

export function loadVoteRefund(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 1287417331) { throw Error('Invalid prefix'); }
    return { $$type: 'VoteRefund' as const };
}

export function loadTupleVoteRefund(source: TupleReader) {
    return { $$type: 'VoteRefund' as const };
}

export function loadGetterTupleVoteRefund(source: TupleReader) {
    return { $$type: 'VoteRefund' as const };
}

export function storeTupleVoteRefund(source: VoteRefund) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserVoteRefund(): DictionaryValue<VoteRefund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeVoteRefund(src)).endCell());
        },
        parse: (src) => {
            return loadVoteRefund(src.loadRef().beginParse());
        }
    }
}

export type ClaimReward = {
    $$type: 'ClaimReward';
}

export function storeClaimReward(src: ClaimReward) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(2151883269, 32);
    };
}

export function loadClaimReward(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 2151883269) { throw Error('Invalid prefix'); }
    return { $$type: 'ClaimReward' as const };
}

export function loadTupleClaimReward(source: TupleReader) {
    return { $$type: 'ClaimReward' as const };
}

export function loadGetterTupleClaimReward(source: TupleReader) {
    return { $$type: 'ClaimReward' as const };
}

export function storeTupleClaimReward(source: ClaimReward) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserClaimReward(): DictionaryValue<ClaimReward> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeClaimReward(src)).endCell());
        },
        parse: (src) => {
            return loadClaimReward(src.loadRef().beginParse());
        }
    }
}

export type FallbackSettle = {
    $$type: 'FallbackSettle';
}

export function storeFallbackSettle(src: FallbackSettle) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3702460484, 32);
    };
}

export function loadFallbackSettle(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3702460484) { throw Error('Invalid prefix'); }
    return { $$type: 'FallbackSettle' as const };
}

export function loadTupleFallbackSettle(source: TupleReader) {
    return { $$type: 'FallbackSettle' as const };
}

export function loadGetterTupleFallbackSettle(source: TupleReader) {
    return { $$type: 'FallbackSettle' as const };
}

export function storeTupleFallbackSettle(source: FallbackSettle) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserFallbackSettle(): DictionaryValue<FallbackSettle> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFallbackSettle(src)).endCell());
        },
        parse: (src) => {
            return loadFallbackSettle(src.loadRef().beginParse());
        }
    }
}

export type SellerStake = {
    $$type: 'SellerStake';
}

export function storeSellerStake(src: SellerStake) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(4053763055, 32);
    };
}

export function loadSellerStake(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 4053763055) { throw Error('Invalid prefix'); }
    return { $$type: 'SellerStake' as const };
}

export function loadTupleSellerStake(source: TupleReader) {
    return { $$type: 'SellerStake' as const };
}

export function loadGetterTupleSellerStake(source: TupleReader) {
    return { $$type: 'SellerStake' as const };
}

export function storeTupleSellerStake(source: SellerStake) {
    const builder = new TupleBuilder();
    return builder.build();
}

export function dictValueParserSellerStake(): DictionaryValue<SellerStake> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSellerStake(src)).endCell());
        },
        parse: (src) => {
            return loadSellerStake(src.loadRef().beginParse());
        }
    }
}

export type NotifyDisputeOpened = {
    $$type: 'NotifyDisputeOpened';
    escrowAddress: Address;
    depositor: Address;
    beneficiary: Address;
    amount: bigint;
    votingDeadline: bigint;
}

export function storeNotifyDisputeOpened(src: NotifyDisputeOpened) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(796807257, 32);
        b_0.storeAddress(src.escrowAddress);
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.votingDeadline, 32);
    };
}

export function loadNotifyDisputeOpened(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 796807257) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _votingDeadline = sc_0.loadUintBig(32);
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function loadTupleNotifyDisputeOpened(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function loadGetterTupleNotifyDisputeOpened(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _amount = source.readBigNumber();
    const _votingDeadline = source.readBigNumber();
    return { $$type: 'NotifyDisputeOpened' as const, escrowAddress: _escrowAddress, depositor: _depositor, beneficiary: _beneficiary, amount: _amount, votingDeadline: _votingDeadline };
}

export function storeTupleNotifyDisputeOpened(source: NotifyDisputeOpened) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.votingDeadline);
    return builder.build();
}

export function dictValueParserNotifyDisputeOpened(): DictionaryValue<NotifyDisputeOpened> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotifyDisputeOpened(src)).endCell());
        },
        parse: (src) => {
            return loadNotifyDisputeOpened(src.loadRef().beginParse());
        }
    }
}

export type NotifyDisputeSettled = {
    $$type: 'NotifyDisputeSettled';
    escrowAddress: Address;
    released: boolean;
    refunded: boolean;
}

export function storeNotifyDisputeSettled(src: NotifyDisputeSettled) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeUint(3214956934, 32);
        b_0.storeAddress(src.escrowAddress);
        b_0.storeBit(src.released);
        b_0.storeBit(src.refunded);
    };
}

export function loadNotifyDisputeSettled(slice: Slice) {
    const sc_0 = slice;
    if (sc_0.loadUint(32) !== 3214956934) { throw Error('Invalid prefix'); }
    const _escrowAddress = sc_0.loadAddress();
    const _released = sc_0.loadBit();
    const _refunded = sc_0.loadBit();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function loadTupleNotifyDisputeSettled(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function loadGetterTupleNotifyDisputeSettled(source: TupleReader) {
    const _escrowAddress = source.readAddress();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    return { $$type: 'NotifyDisputeSettled' as const, escrowAddress: _escrowAddress, released: _released, refunded: _refunded };
}

export function storeTupleNotifyDisputeSettled(source: NotifyDisputeSettled) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.escrowAddress);
    builder.writeBoolean(source.released);
    builder.writeBoolean(source.refunded);
    return builder.build();
}

export function dictValueParserNotifyDisputeSettled(): DictionaryValue<NotifyDisputeSettled> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotifyDisputeSettled(src)).endCell());
        },
        parse: (src) => {
            return loadNotifyDisputeSettled(src.loadRef().beginParse());
        }
    }
}

export type EscrowData = {
    $$type: 'EscrowData';
    depositor: Address;
    beneficiary: Address;
    reputationContract: Address;
    amount: bigint;
    deadline: bigint;
    released: boolean;
    refunded: boolean;
    deliveryConfirmed: boolean;
    disputed: boolean;
    votingDeadline: bigint;
    arbiterCount: bigint;
    votesRelease: bigint;
    votesRefund: bigint;
    minArbiters: bigint;
    minStake: bigint;
    sellerStake: bigint;
    sellerStaked: boolean;
    requireSellerStake: boolean;
    baseSellerStake: bigint;
    requireRepCollateral: boolean;
    minRepScore: bigint;
    autoReleaseAvailable: boolean;
    refundAvailable: boolean;
}

export function storeEscrowData(src: EscrowData) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeAddress(src.reputationContract);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.deadline, 32);
        b_0.storeBit(src.released);
        b_0.storeBit(src.refunded);
        b_0.storeBit(src.deliveryConfirmed);
        b_0.storeBit(src.disputed);
        b_0.storeUint(src.votingDeadline, 32);
        b_0.storeUint(src.arbiterCount, 16);
        const b_1 = new Builder();
        b_1.storeUint(src.votesRelease, 16);
        b_1.storeUint(src.votesRefund, 16);
        b_1.storeUint(src.minArbiters, 8);
        b_1.storeCoins(src.minStake);
        b_1.storeCoins(src.sellerStake);
        b_1.storeBit(src.sellerStaked);
        b_1.storeBit(src.requireSellerStake);
        b_1.storeCoins(src.baseSellerStake);
        b_1.storeBit(src.requireRepCollateral);
        b_1.storeUint(src.minRepScore, 8);
        b_1.storeBit(src.autoReleaseAvailable);
        b_1.storeBit(src.refundAvailable);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadEscrowData(slice: Slice) {
    const sc_0 = slice;
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _reputationContract = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    const _released = sc_0.loadBit();
    const _refunded = sc_0.loadBit();
    const _deliveryConfirmed = sc_0.loadBit();
    const _disputed = sc_0.loadBit();
    const _votingDeadline = sc_0.loadUintBig(32);
    const _arbiterCount = sc_0.loadUintBig(16);
    const sc_1 = sc_0.loadRef().beginParse();
    const _votesRelease = sc_1.loadUintBig(16);
    const _votesRefund = sc_1.loadUintBig(16);
    const _minArbiters = sc_1.loadUintBig(8);
    const _minStake = sc_1.loadCoins();
    const _sellerStake = sc_1.loadCoins();
    const _sellerStaked = sc_1.loadBit();
    const _requireSellerStake = sc_1.loadBit();
    const _baseSellerStake = sc_1.loadCoins();
    const _requireRepCollateral = sc_1.loadBit();
    const _minRepScore = sc_1.loadUintBig(8);
    const _autoReleaseAvailable = sc_1.loadBit();
    const _refundAvailable = sc_1.loadBit();
    return { $$type: 'EscrowData' as const, depositor: _depositor, beneficiary: _beneficiary, reputationContract: _reputationContract, amount: _amount, deadline: _deadline, released: _released, refunded: _refunded, deliveryConfirmed: _deliveryConfirmed, disputed: _disputed, votingDeadline: _votingDeadline, arbiterCount: _arbiterCount, votesRelease: _votesRelease, votesRefund: _votesRefund, minArbiters: _minArbiters, minStake: _minStake, sellerStake: _sellerStake, sellerStaked: _sellerStaked, requireSellerStake: _requireSellerStake, baseSellerStake: _baseSellerStake, requireRepCollateral: _requireRepCollateral, minRepScore: _minRepScore, autoReleaseAvailable: _autoReleaseAvailable, refundAvailable: _refundAvailable };
}

export function loadTupleEscrowData(source: TupleReader) {
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _reputationContract = source.readAddress();
    const _amount = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    const _deliveryConfirmed = source.readBoolean();
    const _disputed = source.readBoolean();
    const _votingDeadline = source.readBigNumber();
    const _arbiterCount = source.readBigNumber();
    const _votesRelease = source.readBigNumber();
    const _votesRefund = source.readBigNumber();
    const _minArbiters = source.readBigNumber();
    source = source.readTuple();
    const _minStake = source.readBigNumber();
    const _sellerStake = source.readBigNumber();
    const _sellerStaked = source.readBoolean();
    const _requireSellerStake = source.readBoolean();
    const _baseSellerStake = source.readBigNumber();
    const _requireRepCollateral = source.readBoolean();
    const _minRepScore = source.readBigNumber();
    const _autoReleaseAvailable = source.readBoolean();
    const _refundAvailable = source.readBoolean();
    return { $$type: 'EscrowData' as const, depositor: _depositor, beneficiary: _beneficiary, reputationContract: _reputationContract, amount: _amount, deadline: _deadline, released: _released, refunded: _refunded, deliveryConfirmed: _deliveryConfirmed, disputed: _disputed, votingDeadline: _votingDeadline, arbiterCount: _arbiterCount, votesRelease: _votesRelease, votesRefund: _votesRefund, minArbiters: _minArbiters, minStake: _minStake, sellerStake: _sellerStake, sellerStaked: _sellerStaked, requireSellerStake: _requireSellerStake, baseSellerStake: _baseSellerStake, requireRepCollateral: _requireRepCollateral, minRepScore: _minRepScore, autoReleaseAvailable: _autoReleaseAvailable, refundAvailable: _refundAvailable };
}

export function loadGetterTupleEscrowData(source: TupleReader) {
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _reputationContract = source.readAddress();
    const _amount = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    const _deliveryConfirmed = source.readBoolean();
    const _disputed = source.readBoolean();
    const _votingDeadline = source.readBigNumber();
    const _arbiterCount = source.readBigNumber();
    const _votesRelease = source.readBigNumber();
    const _votesRefund = source.readBigNumber();
    const _minArbiters = source.readBigNumber();
    const _minStake = source.readBigNumber();
    const _sellerStake = source.readBigNumber();
    const _sellerStaked = source.readBoolean();
    const _requireSellerStake = source.readBoolean();
    const _baseSellerStake = source.readBigNumber();
    const _requireRepCollateral = source.readBoolean();
    const _minRepScore = source.readBigNumber();
    const _autoReleaseAvailable = source.readBoolean();
    const _refundAvailable = source.readBoolean();
    return { $$type: 'EscrowData' as const, depositor: _depositor, beneficiary: _beneficiary, reputationContract: _reputationContract, amount: _amount, deadline: _deadline, released: _released, refunded: _refunded, deliveryConfirmed: _deliveryConfirmed, disputed: _disputed, votingDeadline: _votingDeadline, arbiterCount: _arbiterCount, votesRelease: _votesRelease, votesRefund: _votesRefund, minArbiters: _minArbiters, minStake: _minStake, sellerStake: _sellerStake, sellerStaked: _sellerStaked, requireSellerStake: _requireSellerStake, baseSellerStake: _baseSellerStake, requireRepCollateral: _requireRepCollateral, minRepScore: _minRepScore, autoReleaseAvailable: _autoReleaseAvailable, refundAvailable: _refundAvailable };
}

export function storeTupleEscrowData(source: EscrowData) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeAddress(source.reputationContract);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.deadline);
    builder.writeBoolean(source.released);
    builder.writeBoolean(source.refunded);
    builder.writeBoolean(source.deliveryConfirmed);
    builder.writeBoolean(source.disputed);
    builder.writeNumber(source.votingDeadline);
    builder.writeNumber(source.arbiterCount);
    builder.writeNumber(source.votesRelease);
    builder.writeNumber(source.votesRefund);
    builder.writeNumber(source.minArbiters);
    builder.writeNumber(source.minStake);
    builder.writeNumber(source.sellerStake);
    builder.writeBoolean(source.sellerStaked);
    builder.writeBoolean(source.requireSellerStake);
    builder.writeNumber(source.baseSellerStake);
    builder.writeBoolean(source.requireRepCollateral);
    builder.writeNumber(source.minRepScore);
    builder.writeBoolean(source.autoReleaseAvailable);
    builder.writeBoolean(source.refundAvailable);
    return builder.build();
}

export function dictValueParserEscrowData(): DictionaryValue<EscrowData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrowData(src)).endCell());
        },
        parse: (src) => {
            return loadEscrowData(src.loadRef().beginParse());
        }
    }
}

export type Escrow$Data = {
    $$type: 'Escrow$Data';
    depositor: Address;
    beneficiary: Address;
    reputationContract: Address;
    amount: bigint;
    deadline: bigint;
    released: boolean;
    refunded: boolean;
    deliveryConfirmed: boolean;
    disputed: boolean;
    votingDeadline: bigint;
    minArbiters: bigint;
    minStake: bigint;
    arbiters: Dictionary<bigint, Address>;
    arbiterIndex: Dictionary<Address, bigint>;
    stakes: Dictionary<bigint, bigint>;
    voted: Dictionary<bigint, boolean>;
    votes: Dictionary<bigint, boolean>;
    arbiterCount: bigint;
    votesRelease: bigint;
    votesRefund: bigint;
    sellerStake: bigint;
    sellerStaked: boolean;
    requireSellerStake: boolean;
    baseSellerStake: bigint;
    requireRepCollateral: boolean;
    minRepScore: bigint;
    totalArbiterStakes: bigint;
    storageFund: bigint;
}

export function storeEscrow$Data(src: Escrow$Data) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeAddress(src.reputationContract);
        b_0.storeCoins(src.amount);
        b_0.storeUint(src.deadline, 32);
        b_0.storeBit(src.released);
        b_0.storeBit(src.refunded);
        b_0.storeBit(src.deliveryConfirmed);
        b_0.storeBit(src.disputed);
        b_0.storeUint(src.votingDeadline, 32);
        b_0.storeUint(src.minArbiters, 8);
        const b_1 = new Builder();
        b_1.storeCoins(src.minStake);
        b_1.storeDict(src.arbiters, Dictionary.Keys.BigInt(257), Dictionary.Values.Address());
        b_1.storeDict(src.arbiterIndex, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257));
        b_1.storeDict(src.stakes, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257));
        const b_2 = new Builder();
        b_2.storeDict(src.voted, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool());
        b_2.storeDict(src.votes, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool());
        b_2.storeUint(src.arbiterCount, 16);
        b_2.storeUint(src.votesRelease, 16);
        b_2.storeUint(src.votesRefund, 16);
        b_2.storeCoins(src.sellerStake);
        b_2.storeBit(src.sellerStaked);
        b_2.storeBit(src.requireSellerStake);
        b_2.storeCoins(src.baseSellerStake);
        b_2.storeBit(src.requireRepCollateral);
        b_2.storeUint(src.minRepScore, 8);
        b_2.storeCoins(src.totalArbiterStakes);
        b_2.storeCoins(src.storageFund);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadEscrow$Data(slice: Slice) {
    const sc_0 = slice;
    const _depositor = sc_0.loadAddress();
    const _beneficiary = sc_0.loadAddress();
    const _reputationContract = sc_0.loadAddress();
    const _amount = sc_0.loadCoins();
    const _deadline = sc_0.loadUintBig(32);
    const _released = sc_0.loadBit();
    const _refunded = sc_0.loadBit();
    const _deliveryConfirmed = sc_0.loadBit();
    const _disputed = sc_0.loadBit();
    const _votingDeadline = sc_0.loadUintBig(32);
    const _minArbiters = sc_0.loadUintBig(8);
    const sc_1 = sc_0.loadRef().beginParse();
    const _minStake = sc_1.loadCoins();
    const _arbiters = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.Address(), sc_1);
    const _arbiterIndex = Dictionary.load(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), sc_1);
    const _stakes = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), sc_1);
    const sc_2 = sc_1.loadRef().beginParse();
    const _voted = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), sc_2);
    const _votes = Dictionary.load(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), sc_2);
    const _arbiterCount = sc_2.loadUintBig(16);
    const _votesRelease = sc_2.loadUintBig(16);
    const _votesRefund = sc_2.loadUintBig(16);
    const _sellerStake = sc_2.loadCoins();
    const _sellerStaked = sc_2.loadBit();
    const _requireSellerStake = sc_2.loadBit();
    const _baseSellerStake = sc_2.loadCoins();
    const _requireRepCollateral = sc_2.loadBit();
    const _minRepScore = sc_2.loadUintBig(8);
    const _totalArbiterStakes = sc_2.loadCoins();
    const _storageFund = sc_2.loadCoins();
    return { $$type: 'Escrow$Data' as const, depositor: _depositor, beneficiary: _beneficiary, reputationContract: _reputationContract, amount: _amount, deadline: _deadline, released: _released, refunded: _refunded, deliveryConfirmed: _deliveryConfirmed, disputed: _disputed, votingDeadline: _votingDeadline, minArbiters: _minArbiters, minStake: _minStake, arbiters: _arbiters, arbiterIndex: _arbiterIndex, stakes: _stakes, voted: _voted, votes: _votes, arbiterCount: _arbiterCount, votesRelease: _votesRelease, votesRefund: _votesRefund, sellerStake: _sellerStake, sellerStaked: _sellerStaked, requireSellerStake: _requireSellerStake, baseSellerStake: _baseSellerStake, requireRepCollateral: _requireRepCollateral, minRepScore: _minRepScore, totalArbiterStakes: _totalArbiterStakes, storageFund: _storageFund };
}

export function loadTupleEscrow$Data(source: TupleReader) {
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _reputationContract = source.readAddress();
    const _amount = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    const _deliveryConfirmed = source.readBoolean();
    const _disputed = source.readBoolean();
    const _votingDeadline = source.readBigNumber();
    const _minArbiters = source.readBigNumber();
    const _minStake = source.readBigNumber();
    const _arbiters = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Address(), source.readCellOpt());
    const _arbiterIndex = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    source = source.readTuple();
    const _stakes = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _voted = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    const _votes = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    const _arbiterCount = source.readBigNumber();
    const _votesRelease = source.readBigNumber();
    const _votesRefund = source.readBigNumber();
    const _sellerStake = source.readBigNumber();
    const _sellerStaked = source.readBoolean();
    const _requireSellerStake = source.readBoolean();
    const _baseSellerStake = source.readBigNumber();
    const _requireRepCollateral = source.readBoolean();
    const _minRepScore = source.readBigNumber();
    const _totalArbiterStakes = source.readBigNumber();
    const _storageFund = source.readBigNumber();
    return { $$type: 'Escrow$Data' as const, depositor: _depositor, beneficiary: _beneficiary, reputationContract: _reputationContract, amount: _amount, deadline: _deadline, released: _released, refunded: _refunded, deliveryConfirmed: _deliveryConfirmed, disputed: _disputed, votingDeadline: _votingDeadline, minArbiters: _minArbiters, minStake: _minStake, arbiters: _arbiters, arbiterIndex: _arbiterIndex, stakes: _stakes, voted: _voted, votes: _votes, arbiterCount: _arbiterCount, votesRelease: _votesRelease, votesRefund: _votesRefund, sellerStake: _sellerStake, sellerStaked: _sellerStaked, requireSellerStake: _requireSellerStake, baseSellerStake: _baseSellerStake, requireRepCollateral: _requireRepCollateral, minRepScore: _minRepScore, totalArbiterStakes: _totalArbiterStakes, storageFund: _storageFund };
}

export function loadGetterTupleEscrow$Data(source: TupleReader) {
    const _depositor = source.readAddress();
    const _beneficiary = source.readAddress();
    const _reputationContract = source.readAddress();
    const _amount = source.readBigNumber();
    const _deadline = source.readBigNumber();
    const _released = source.readBoolean();
    const _refunded = source.readBoolean();
    const _deliveryConfirmed = source.readBoolean();
    const _disputed = source.readBoolean();
    const _votingDeadline = source.readBigNumber();
    const _minArbiters = source.readBigNumber();
    const _minStake = source.readBigNumber();
    const _arbiters = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Address(), source.readCellOpt());
    const _arbiterIndex = Dictionary.loadDirect(Dictionary.Keys.Address(), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _stakes = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
    const _voted = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    const _votes = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.Bool(), source.readCellOpt());
    const _arbiterCount = source.readBigNumber();
    const _votesRelease = source.readBigNumber();
    const _votesRefund = source.readBigNumber();
    const _sellerStake = source.readBigNumber();
    const _sellerStaked = source.readBoolean();
    const _requireSellerStake = source.readBoolean();
    const _baseSellerStake = source.readBigNumber();
    const _requireRepCollateral = source.readBoolean();
    const _minRepScore = source.readBigNumber();
    const _totalArbiterStakes = source.readBigNumber();
    const _storageFund = source.readBigNumber();
    return { $$type: 'Escrow$Data' as const, depositor: _depositor, beneficiary: _beneficiary, reputationContract: _reputationContract, amount: _amount, deadline: _deadline, released: _released, refunded: _refunded, deliveryConfirmed: _deliveryConfirmed, disputed: _disputed, votingDeadline: _votingDeadline, minArbiters: _minArbiters, minStake: _minStake, arbiters: _arbiters, arbiterIndex: _arbiterIndex, stakes: _stakes, voted: _voted, votes: _votes, arbiterCount: _arbiterCount, votesRelease: _votesRelease, votesRefund: _votesRefund, sellerStake: _sellerStake, sellerStaked: _sellerStaked, requireSellerStake: _requireSellerStake, baseSellerStake: _baseSellerStake, requireRepCollateral: _requireRepCollateral, minRepScore: _minRepScore, totalArbiterStakes: _totalArbiterStakes, storageFund: _storageFund };
}

export function storeTupleEscrow$Data(source: Escrow$Data) {
    const builder = new TupleBuilder();
    builder.writeAddress(source.depositor);
    builder.writeAddress(source.beneficiary);
    builder.writeAddress(source.reputationContract);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.deadline);
    builder.writeBoolean(source.released);
    builder.writeBoolean(source.refunded);
    builder.writeBoolean(source.deliveryConfirmed);
    builder.writeBoolean(source.disputed);
    builder.writeNumber(source.votingDeadline);
    builder.writeNumber(source.minArbiters);
    builder.writeNumber(source.minStake);
    builder.writeCell(source.arbiters.size > 0 ? beginCell().storeDictDirect(source.arbiters, Dictionary.Keys.BigInt(257), Dictionary.Values.Address()).endCell() : null);
    builder.writeCell(source.arbiterIndex.size > 0 ? beginCell().storeDictDirect(source.arbiterIndex, Dictionary.Keys.Address(), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.stakes.size > 0 ? beginCell().storeDictDirect(source.stakes, Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257)).endCell() : null);
    builder.writeCell(source.voted.size > 0 ? beginCell().storeDictDirect(source.voted, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()).endCell() : null);
    builder.writeCell(source.votes.size > 0 ? beginCell().storeDictDirect(source.votes, Dictionary.Keys.BigInt(257), Dictionary.Values.Bool()).endCell() : null);
    builder.writeNumber(source.arbiterCount);
    builder.writeNumber(source.votesRelease);
    builder.writeNumber(source.votesRefund);
    builder.writeNumber(source.sellerStake);
    builder.writeBoolean(source.sellerStaked);
    builder.writeBoolean(source.requireSellerStake);
    builder.writeNumber(source.baseSellerStake);
    builder.writeBoolean(source.requireRepCollateral);
    builder.writeNumber(source.minRepScore);
    builder.writeNumber(source.totalArbiterStakes);
    builder.writeNumber(source.storageFund);
    return builder.build();
}

export function dictValueParserEscrow$Data(): DictionaryValue<Escrow$Data> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeEscrow$Data(src)).endCell());
        },
        parse: (src) => {
            return loadEscrow$Data(src.loadRef().beginParse());
        }
    }
}

 type Escrow_init_args = {
    $$type: 'Escrow_init_args';
    depositor: Address;
    beneficiary: Address;
    deadline: bigint;
    minArbiters: bigint;
    minStake: bigint;
    reputationContract: Address;
    requireRepCollateral: boolean;
    minRepScore: bigint;
    baseSellerStake: bigint;
}

function initEscrow_init_args(src: Escrow_init_args) {
    return (builder: Builder) => {
        const b_0 = builder;
        b_0.storeAddress(src.depositor);
        b_0.storeAddress(src.beneficiary);
        b_0.storeInt(src.deadline, 257);
        const b_1 = new Builder();
        b_1.storeInt(src.minArbiters, 257);
        b_1.storeInt(src.minStake, 257);
        b_1.storeAddress(src.reputationContract);
        b_1.storeBit(src.requireRepCollateral);
        const b_2 = new Builder();
        b_2.storeInt(src.minRepScore, 257);
        b_2.storeInt(src.baseSellerStake, 257);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

async function Escrow_init(depositor: Address, beneficiary: Address, deadline: bigint, minArbiters: bigint, minStake: bigint, reputationContract: Address, requireRepCollateral: boolean, minRepScore: bigint, baseSellerStake: bigint) {
    const __code = Cell.fromHex('b5ee9c7241024b0100177000022cff008e88f4a413f4bcf2c80bed53208e8130e1ed43d90108020378e00204038db96c0ed44d0d200018eb2fa40fa40810101d700d401d0810101d700810101d700fa40d200d430d0810101d700810101d7003010691068106709d15507e30ddb3c57105f0f6cc18090a030008f8276f1004f1bbed2ed44d0d200018eb2fa40fa40810101d700d401d0810101d700810101d700fa40d200d430d0810101d700810101d7003010691068106709d15507e30ddb3c57175717571757175717571757175717571757175717571757175717571757175717571757175717571757175717571757175717571757178090a050701f4f8235618be9256149170e2935616b39170e2935615b39170e2935613b39170e2f8235619be935615b39170e2935617b39170e2935616b39170e2935614b39170e2561d02561d02561d02561d02561d02561d02561d02561d02561d02561d0256160256160256160256200256200256180256180256180256180206000c56180256185900501111111611111110111511100f11140f0e11130e0d11120d0c11110c0b11100b10af109e108d554704ea01d072d721d200d200fa4021103450666f04f86102f862ed44d0d200018eb2fa40fa40810101d700d401d0810101d700810101d700fa40d200d430d0810101d700810101d7003010691068106709d15507e30d111d945f0f5f0ee0111bd70d1ff2e082218210f19f83efbae302218210f8aa2f92ba090a0d0f00b06d6d6d6d6d7070707070547444530070561253221116111911160d11180d1116111711160c11160c0b11150b0a11140a09111309081112080d11110d0c11100c108f10de10cd108c108b107a10691058104710365e2210230198db3c571c111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f550e0b01f6fa40fa40fa40fa00d31fd200d200d200d200d31fd307d401d0fa00f404f404f404d430d0f404f404d30fd30fd30ffa00d200d200fa00d200d307fa00fa00301111111c11111111111b11111111111a11111111111911111111111811111111111711111111111611111111111511111111111411111111111311110c000c11111112111102fe5b35815c50f8425619c705f2f48116595614b3935613b39170e2f2f422f2e78d8200e85004b314f2f48200c718f8416f24135f03c200f2f4f8416f24135f037f111b82082dc6c0a0561622a0561ba021a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016e3e0e01f0b0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681716103510241023db3c4902fe8efd5b23978200f23125f2f4def8416f24135f0301111701a0111b82082dc6c0a01119111b11191118111a11181117111911171117111811171115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354430db3c4910044ee0218210d2d77e02bae3022182101856d189bae30221821083fb1615bae302218210464d5ef3ba1113151902fc5b5712820097dbf842561ac705f2f48116595614b3935613b39170e2f2f47f111b82082dc6c0a0561626a0561ba021a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11193e1201b01118111a11181117111911171116111811161115111711151114111611141113111511131113111411131111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354430db3c4902f45b8116591115b3935613b39170e201111501f2f48164275611b3f2f48200af75f842561ac705f2f48200a1c75616c200f2f47f708100827088561c553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b1119141c002600000000457363726f772072656c656173656403f45b8116595615b3931114b393571470e201111401f2f48164275611b3f2f48200a1c75616c200f2f4f8235615b99c8200f74df842561ac705f2f499561195812a05f2f0dee27f708100827088561d553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf818ae2f400c901fb00161718002600000000457363726f7720726566756e646564001a58cf8680cf8480f400f400cf8101b61119111b11191118111a111811171119111711161118111611151117111511141116111411151112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012db3c49043ae3022182109ec0cde6bae302218210c28a4884bae30221820aaade5bba1a1d212502fe5b8200bc49f8235617bef2f48200cc285613f2f48116591115b3935613b39170e201111501f2f45610b3f2e4a18200a1c75616c200f2f47f708100827088561c553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11191b1c0040000000004175746f2d72656c656173656420616674657220646561646c696e6501a81118111a111811171119111711161118111611151117111511161113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354403db3c4901fe5b57108200e28cf842561ac705917f96f8425619c705e2f2f48116595614b3935613b39170e2f2f48200ae571111b301111101f2f47ff8238203f480a0111b82084c4b40a08209c9c380727ff828561d561d561c5622c8554082102f7e50595006cb1f14ce12cece01fa02cb1fc9561b553010246d50436d03c8cf8580ca001e03f689cf16ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00561626a0561ba021a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001f3e2000011001b41119111b11191118111a111811171119111711161118111611151117111511141116111411131115111311121114111201111301011112010f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610351024db3c4901fa5b81575a5612f2f48116595615b3935614b39170e2f2f4813c8df8235612b9f2f4810f8929c164f2f4813ce7f842561bc705b3f2f482009100f842561ac705b3f2f481010bf8422e598101014133f40a6fa19401d70030925b6de281654b016ef2f4f8416f24135f038126e7215611bef2f4810101f8420211100252b02201fe206e953059f45a30944133f414e281010bf842102f2b810101216e955b59f4593098c801cf004133f441e2810101541d0052b0561101216e955b59f45a3098c801cf004133f442e20b8101012a7071216e955b59f45a3098c801cf004133f442e209a401111b010ea0111b82082dc6c0a0561626a0561ca021a082089896802302fea070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211103e24013e0f11110f0e11100e10cf10be10ad5e3810791068105710461035443012db3c4902f88ef85b81575a5612f2f48116595615b3935614b39170e2f2f48153fa295611bef2f481010bf8422e598101014133f40a6fa19401d70030925b6de2814a09216eb3f2f4206ef2d0802b81010122714133f40c6fa19401d70030925b6de2812583216eb3f2f48200e7e901206ef2d080c000f2f40b8101012c7f71e021262c0372216e955b59f45a3098c801cf004133f442e21a810101500c7f71216e955b59f45a3098c801cf004133f442e207a428ab00a45210bee30fdb3c272a4903fe57141118111a11181117111911171116111811161115111711151114111611147f11161113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac5e37108910681057104610354403db3c708100827088561e553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c42282900380000000052656c6561736564206279206172626974657220766f7465003a6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0002fa111b82082dc6c0a0561626a0561ba021a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11191118111a11181117111911171116111811161115111711151114111611143e2b006e1113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac5e3710791068105710461035443012044a82104cbc6df3bae30221821080432205bae302218210dcaf1044bae302018210946a98b6ba2d34404701f05b81575a5612f2f48116595615b3935614b39170e2f2f48153fa295611bef2f481010bf8422e598101014133f40a6fa19401d70030925b6de2814a09216eb3f2f4206ef2d0802b81010122714133f40c6fa19401d70030925b6de2812583216eb3f2f48200e7e901206ef2d080c000f2f40b8101012c7f712e0372216e955b59f45a3098c801cf004133f442e21a810101500c7071216e955b59f45a3098c801cf004133f442e206a428ab00a45210bee30fdb3c2f324903fc57131118111a11181117111911171116111811161115111711151114111611141113111511137f11151112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac106b108a10791068105710461035443012db3c708100827088561f553010246d50436d03c8cf8580ca00cf8440ce01fa028069423031003800000000526566756e646564206279206172626974657220766f74650042cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0002fa111b82082dc6c0a0561626a0561ba021a08208989680a070fb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11191118111a11181117111911171116111811161115111711151114111611143e3300721113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac106b108a1079106810571046103544301201f85b8168575615917f925614e2f2f481010bf8422e598101014133f40a6fa19401d70030925b6de2814a09216eb3f2f4206ef2d080810101545d0052304133f40c6fa19401d70030925b6de2812583216eb3f2f482009d7321206ef2d080c200f2f42c81010123714133f40c6fa19401d70030925b6de28174c1216eb33502fe9801206ef2d080c0ff923170e2f2f42b81010123714133f40c6fa19401d70030925b6de2206ef2d08020c0ff9256179170e292307f98c0009256159170e2e221206ef2d08001111e01a181010170210411110410231025216e955b59f45a3098c801cf004133f442e2111c913ce30d561626a02ca0561ca08208989680a070363d02f4111a111b111a1119111a11191118111911181117111811171116111711161115111611151114111511141113111411131112111311121111111211111110111111100f11100f10ef10de550b111cdb3c111b111c111b111a111c111a1119111c11191118111c11181117111c11171116111c11161115111c111537390112702093530cb98ae8303800e82d81010122714133f40c6fa19401d70030925b6de2206eb38e5620206ef2d080c0ff9256199170e292307f9d206ef2d080c0009256179170e2e28e338101012056115422334133f40c6fa19401d70030925b6de2206eb39820206ef2d080c2009170e298206ef2d08012a0019130e2df9130e2a403fc1114111c11141113111c11131112111c11121111111c11111110111c11100f111c0f0e111c0e0d111c0d0c111c0c0b111c0b0a111c0a09111c09111c0807065540db3c7021c200993001111d01a904111c93571e30e2111d206ef2d08001111ca0f842727088103410246d50436d03c8cf8580ca00cf8440ce01fa0280693a3b3c00ee702093530cb98e6d2d81010122714133f40c6fa19401d70030925b6de2206eb38e4f20206ef2d080c0ff9256199170e292307f9d206ef2d080c0009256179170e2e28e2c8101012056115422334133f40c6fa19401d70030925b6de2206eb397206ef2d080c200923070e29301a401dede9130e2a4e8300036000000004172626974657220726577617264202877696e6e657229004acf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb000b111a0b02fafb02f84270810082708810246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb001119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211103e3f00140000000045786365737301280f11110f0e11100e10df10ce10cd10ac5519db3c4901fc5b81575a5612f2f48116595615b3935614b39170e2f2f48200d92bf8235612bef2f4538fb9917f935376bae28e1356129357147f9b57131112111311127f1113e28e145376bc9357147f9b57131112111311127f1113e2e21119111b11191118111a111811171119111711161118111611151117111511161113111511134104f61112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a107910681057104610354403db3c56168ec1708100827088561f553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00e30d4243444600c256138e5c8209312d00727ff828561a561ac855208210bfa059865004cb1f12ceca00ca00c9561d553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb00de002c0000000046616c6c6261636b3a20726566756e6465640182708100827088561e553010246d50436d03c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb0045002c0000000046616c6c6261636b3a2072656c65617365640104db3c4901fc8ef4d33f30c8018210aff90f5758cb1fcb3fc9111a111c111a1119111b11191118111a11181117111911171116111811161115111711151114111611141113111511131112111411121111111311111110111211100f11110f0e11100e10df10ce10bd10ac109b108a10791068105710461035443012e05f0f5f0ef2c0824801caf84270f8276f10f8416f24135f03a1820afaf080b98e29820afaf08070fb0270500381008201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb008e20705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00e2db3c490142c87f01ca00111c111b111a111911181117111611151114111311121111111055e04a00de01111b01111cce01111901ce01111701ce011115fa0201111301cb1f01111101ca001fca001dca001bca0019cb1f17cb07c85006fa0214f40012f400f40001c8f40013f40013cb0f13cb0f13cb0f5003fa0213ca0013ca005003fa0213ca0013cb075003fa025003fa02cdcdc9ed54b138d70c');
    const builder = beginCell();
    builder.storeUint(0, 1);
    initEscrow_init_args({ $$type: 'Escrow_init_args', depositor, beneficiary, deadline, minArbiters, minStake, reputationContract, requireRepCollateral, minRepScore, baseSellerStake })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

export const Escrow_errors = {
    2: { message: "Stack underflow" },
    3: { message: "Stack overflow" },
    4: { message: "Integer overflow" },
    5: { message: "Integer out of expected range" },
    6: { message: "Invalid opcode" },
    7: { message: "Type check error" },
    8: { message: "Cell overflow" },
    9: { message: "Cell underflow" },
    10: { message: "Dictionary error" },
    11: { message: "'Unknown' error" },
    12: { message: "Fatal error" },
    13: { message: "Out of gas error" },
    14: { message: "Virtualization error" },
    32: { message: "Action list is invalid" },
    33: { message: "Action list is too long" },
    34: { message: "Action is invalid or not supported" },
    35: { message: "Invalid source address in outbound message" },
    36: { message: "Invalid destination address in outbound message" },
    37: { message: "Not enough Toncoin" },
    38: { message: "Not enough extra currencies" },
    39: { message: "Outbound message does not fit into a cell after rewriting" },
    40: { message: "Cannot process a message" },
    41: { message: "Library reference is null" },
    42: { message: "Library change action error" },
    43: { message: "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree" },
    50: { message: "Account state size exceeded limits" },
    128: { message: "Null reference exception" },
    129: { message: "Invalid serialization prefix" },
    130: { message: "Invalid incoming message" },
    131: { message: "Constraints error" },
    132: { message: "Access denied" },
    133: { message: "Contract stopped" },
    134: { message: "Invalid argument" },
    135: { message: "Code of a contract was not found" },
    136: { message: "Invalid standard address" },
    138: { message: "Not a basechain address" },
    1185: { message: "Disputed — waiting for arbiter vote" },
    1933: { message: "Seller stake not required" },
    3977: { message: "Max arbiters reached" },
    5721: { message: "Already settled" },
    9603: { message: "Not registered" },
    9959: { message: "Stake too low" },
    10757: { message: "Delivery confirmed — open a dispute to contest" },
    15501: { message: "Voting period ended" },
    15591: { message: "Depositor cannot be arbiter" },
    18953: { message: "Not an arbiter" },
    21498: { message: "Not enough arbiters yet" },
    22362: { message: "No active dispute" },
    23632: { message: "Only beneficiary (seller) can stake" },
    25639: { message: "Disputed — use voting" },
    25931: { message: "Already joined" },
    26711: { message: "Not settled yet" },
    29889: { message: "Did not vote" },
    37120: { message: "Beneficiary cannot be arbiter" },
    38875: { message: "Only depositor can confirm delivery" },
    40307: { message: "Already claimed or no stake" },
    41415: { message: "No funds" },
    44631: { message: "Already disputed" },
    44917: { message: "Only depositor can release" },
    48201: { message: "Deadline not reached" },
    50968: { message: "Must send TON as stake" },
    52264: { message: "Delivery not confirmed by buyer" },
    55595: { message: "Voting period not ended" },
    57996: { message: "Only depositor or beneficiary" },
    59369: { message: "Already voted" },
    59472: { message: "Already staked" },
    62001: { message: "Seller must stake first" },
    63309: { message: "Only depositor can refund before deadline" },
} as const

export const Escrow_errors_backward = {
    "Stack underflow": 2,
    "Stack overflow": 3,
    "Integer overflow": 4,
    "Integer out of expected range": 5,
    "Invalid opcode": 6,
    "Type check error": 7,
    "Cell overflow": 8,
    "Cell underflow": 9,
    "Dictionary error": 10,
    "'Unknown' error": 11,
    "Fatal error": 12,
    "Out of gas error": 13,
    "Virtualization error": 14,
    "Action list is invalid": 32,
    "Action list is too long": 33,
    "Action is invalid or not supported": 34,
    "Invalid source address in outbound message": 35,
    "Invalid destination address in outbound message": 36,
    "Not enough Toncoin": 37,
    "Not enough extra currencies": 38,
    "Outbound message does not fit into a cell after rewriting": 39,
    "Cannot process a message": 40,
    "Library reference is null": 41,
    "Library change action error": 42,
    "Exceeded maximum number of cells in the library or the maximum depth of the Merkle tree": 43,
    "Account state size exceeded limits": 50,
    "Null reference exception": 128,
    "Invalid serialization prefix": 129,
    "Invalid incoming message": 130,
    "Constraints error": 131,
    "Access denied": 132,
    "Contract stopped": 133,
    "Invalid argument": 134,
    "Code of a contract was not found": 135,
    "Invalid standard address": 136,
    "Not a basechain address": 138,
    "Disputed — waiting for arbiter vote": 1185,
    "Seller stake not required": 1933,
    "Max arbiters reached": 3977,
    "Already settled": 5721,
    "Not registered": 9603,
    "Stake too low": 9959,
    "Delivery confirmed — open a dispute to contest": 10757,
    "Voting period ended": 15501,
    "Depositor cannot be arbiter": 15591,
    "Not an arbiter": 18953,
    "Not enough arbiters yet": 21498,
    "No active dispute": 22362,
    "Only beneficiary (seller) can stake": 23632,
    "Disputed — use voting": 25639,
    "Already joined": 25931,
    "Not settled yet": 26711,
    "Did not vote": 29889,
    "Beneficiary cannot be arbiter": 37120,
    "Only depositor can confirm delivery": 38875,
    "Already claimed or no stake": 40307,
    "No funds": 41415,
    "Already disputed": 44631,
    "Only depositor can release": 44917,
    "Deadline not reached": 48201,
    "Must send TON as stake": 50968,
    "Delivery not confirmed by buyer": 52264,
    "Voting period not ended": 55595,
    "Only depositor or beneficiary": 57996,
    "Already voted": 59369,
    "Already staked": 59472,
    "Seller must stake first": 62001,
    "Only depositor can refund before deadline": 63309,
} as const

const Escrow_types: ABIType[] = [
    {"name":"DataSize","header":null,"fields":[{"name":"cells","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bits","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"refs","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"SignedBundle","header":null,"fields":[{"name":"signature","type":{"kind":"simple","type":"fixed-bytes","optional":false,"format":64}},{"name":"signedData","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounceable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"MessageParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"DeployParameters","header":null,"fields":[{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"init","type":{"kind":"simple","type":"StateInit","optional":false}}]},
    {"name":"StdAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":8}},{"name":"address","type":{"kind":"simple","type":"uint","optional":false,"format":256}}]},
    {"name":"VarAddress","header":null,"fields":[{"name":"workchain","type":{"kind":"simple","type":"int","optional":false,"format":32}},{"name":"address","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"BasechainAddress","header":null,"fields":[{"name":"hash","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwner","header":2174598809,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"ChangeOwnerOk","header":846932810,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"newOwner","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Deposit","header":4171902866,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Release","header":408342921,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Refund","header":2214270485,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeliveryConfirmed","header":3537337858,"fields":[{"name":"x402TxHash","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"AutoRelease","header":1179475699,"fields":[]},
    {"name":"OpenDispute","header":2663435750,"fields":[]},
    {"name":"JoinDispute","header":3263842436,"fields":[]},
    {"name":"VoteRelease","header":44752475,"fields":[]},
    {"name":"VoteRefund","header":1287417331,"fields":[]},
    {"name":"ClaimReward","header":2151883269,"fields":[]},
    {"name":"FallbackSettle","header":3702460484,"fields":[]},
    {"name":"SellerStake","header":4053763055,"fields":[]},
    {"name":"NotifyDisputeOpened","header":796807257,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}}]},
    {"name":"NotifyDisputeSettled","header":3214956934,"fields":[{"name":"escrowAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"released","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"EscrowData","header":null,"fields":[{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"reputationContract","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"released","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}},{"name":"deliveryConfirmed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"disputed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"arbiterCount","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"votesRelease","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"votesRefund","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"minArbiters","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"minStake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"sellerStake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"sellerStaked","type":{"kind":"simple","type":"bool","optional":false}},{"name":"requireSellerStake","type":{"kind":"simple","type":"bool","optional":false}},{"name":"baseSellerStake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"requireRepCollateral","type":{"kind":"simple","type":"bool","optional":false}},{"name":"minRepScore","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"autoReleaseAvailable","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refundAvailable","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Escrow$Data","header":null,"fields":[{"name":"depositor","type":{"kind":"simple","type":"address","optional":false}},{"name":"beneficiary","type":{"kind":"simple","type":"address","optional":false}},{"name":"reputationContract","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"deadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"released","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}},{"name":"deliveryConfirmed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"disputed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"votingDeadline","type":{"kind":"simple","type":"uint","optional":false,"format":32}},{"name":"minArbiters","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"minStake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"arbiters","type":{"kind":"dict","key":"int","value":"address"}},{"name":"arbiterIndex","type":{"kind":"dict","key":"address","value":"int"}},{"name":"stakes","type":{"kind":"dict","key":"int","value":"int"}},{"name":"voted","type":{"kind":"dict","key":"int","value":"bool"}},{"name":"votes","type":{"kind":"dict","key":"int","value":"bool"}},{"name":"arbiterCount","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"votesRelease","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"votesRefund","type":{"kind":"simple","type":"uint","optional":false,"format":16}},{"name":"sellerStake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"sellerStaked","type":{"kind":"simple","type":"bool","optional":false}},{"name":"requireSellerStake","type":{"kind":"simple","type":"bool","optional":false}},{"name":"baseSellerStake","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"requireRepCollateral","type":{"kind":"simple","type":"bool","optional":false}},{"name":"minRepScore","type":{"kind":"simple","type":"uint","optional":false,"format":8}},{"name":"totalArbiterStakes","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"storageFund","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}}]},
]

const Escrow_opcodes = {
    "Deploy": 2490013878,
    "DeployOk": 2952335191,
    "FactoryDeploy": 1829761339,
    "ChangeOwner": 2174598809,
    "ChangeOwnerOk": 846932810,
    "Deposit": 4171902866,
    "Release": 408342921,
    "Refund": 2214270485,
    "DeliveryConfirmed": 3537337858,
    "AutoRelease": 1179475699,
    "OpenDispute": 2663435750,
    "JoinDispute": 3263842436,
    "VoteRelease": 44752475,
    "VoteRefund": 1287417331,
    "ClaimReward": 2151883269,
    "FallbackSettle": 3702460484,
    "SellerStake": 4053763055,
    "NotifyDisputeOpened": 796807257,
    "NotifyDisputeSettled": 3214956934,
}

const Escrow_getters: ABIGetter[] = [
    {"name":"escrowData","methodId":130770,"arguments":[],"returnType":{"kind":"simple","type":"EscrowData","optional":false}},
    {"name":"balance","methodId":104128,"arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
]

export const Escrow_getterMapping: { [key: string]: string } = {
    'escrowData': 'getEscrowData',
    'balance': 'getBalance',
}

const Escrow_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"SellerStake"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deposit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"DeliveryConfirmed"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Release"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Refund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AutoRelease"}},
    {"receiver":"internal","message":{"kind":"typed","type":"OpenDispute"}},
    {"receiver":"internal","message":{"kind":"typed","type":"JoinDispute"}},
    {"receiver":"internal","message":{"kind":"typed","type":"VoteRelease"}},
    {"receiver":"internal","message":{"kind":"typed","type":"VoteRefund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"ClaimReward"}},
    {"receiver":"internal","message":{"kind":"typed","type":"FallbackSettle"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]


export class Escrow implements Contract {
    
    public static readonly storageReserve = 50000000n;
    public static readonly errors = Escrow_errors_backward;
    public static readonly opcodes = Escrow_opcodes;
    
    static async init(depositor: Address, beneficiary: Address, deadline: bigint, minArbiters: bigint, minStake: bigint, reputationContract: Address, requireRepCollateral: boolean, minRepScore: bigint, baseSellerStake: bigint) {
        return await Escrow_init(depositor, beneficiary, deadline, minArbiters, minStake, reputationContract, requireRepCollateral, minRepScore, baseSellerStake);
    }
    
    static async fromInit(depositor: Address, beneficiary: Address, deadline: bigint, minArbiters: bigint, minStake: bigint, reputationContract: Address, requireRepCollateral: boolean, minRepScore: bigint, baseSellerStake: bigint) {
        const __gen_init = await Escrow_init(depositor, beneficiary, deadline, minArbiters, minStake, reputationContract, requireRepCollateral, minRepScore, baseSellerStake);
        const address = contractAddress(0, __gen_init);
        return new Escrow(address, __gen_init);
    }
    
    static fromAddress(address: Address) {
        return new Escrow(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  Escrow_types,
        getters: Escrow_getters,
        receivers: Escrow_receivers,
        errors: Escrow_errors,
    };
    
    constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: SellerStake | Deposit | DeliveryConfirmed | Release | Refund | AutoRelease | OpenDispute | JoinDispute | VoteRelease | VoteRefund | ClaimReward | FallbackSettle | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'SellerStake') {
            body = beginCell().store(storeSellerStake(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deposit') {
            body = beginCell().store(storeDeposit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'DeliveryConfirmed') {
            body = beginCell().store(storeDeliveryConfirmed(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Release') {
            body = beginCell().store(storeRelease(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Refund') {
            body = beginCell().store(storeRefund(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AutoRelease') {
            body = beginCell().store(storeAutoRelease(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'OpenDispute') {
            body = beginCell().store(storeOpenDispute(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'JoinDispute') {
            body = beginCell().store(storeJoinDispute(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'VoteRelease') {
            body = beginCell().store(storeVoteRelease(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'VoteRefund') {
            body = beginCell().store(storeVoteRefund(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'ClaimReward') {
            body = beginCell().store(storeClaimReward(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'FallbackSettle') {
            body = beginCell().store(storeFallbackSettle(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getEscrowData(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('escrowData', builder.build())).stack;
        const result = loadGetterTupleEscrowData(source);
        return result;
    }
    
    async getBalance(provider: ContractProvider) {
        const builder = new TupleBuilder();
        const source = (await provider.get('balance', builder.build())).stack;
        const result = source.readBigNumber();
        return result;
    }
    
}