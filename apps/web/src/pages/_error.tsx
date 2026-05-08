function Error({ statusCode }: { statusCode: number }) {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>{statusCode || 'Hata'}</h1>
      <p>Bir sorun oluştu. Lütfen tekrar deneyin.</p>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: any) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;